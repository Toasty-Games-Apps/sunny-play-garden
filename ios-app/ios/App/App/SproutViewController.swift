import UIKit
import Capacitor
import Photos
import AVFoundation

// The one screen of the app: Capacitor's web view with the game in it, set up for small children.
//  - no status bar, and the home indicator fades away (both through Capacitor's own SystemBars plugin, `hidden` in capacitor.config.json,
//    because Capacitor 8 owns prefersHomeIndicatorAutoHidden);
//  - a swipe from any edge first only shows the system handle, so a toddler sliding a finger off the edge of a game does not leave the
//    app (a second swipe still works, so a grown-up is never locked in; Guided Access is the real lock);
//  - the screen stays on while the app is open, like the website's wake lock;
//  - the web view always fills the window, so any window size (iPad windows, iPhone Duo outer and inner displays, rotation) just
//    resizes the page and the game lays itself out again. Nothing here looks at the device model or the screen size.
class SproutViewController: CAPBridgeViewController {
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SproutPhotosPlugin())
        #if DEBUG
        bridge?.registerPluginInstance(SproutTestPlugin())
        #endif
        // After a phone call, Siri or an alarm the web audio is left paused; tell the page so its sound comes back without a tap.
        NotificationCenter.default.addObserver(self, selector: #selector(audioInterrupted(_:)), name: AVAudioSession.interruptionNotification, object: nil)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        UIApplication.shared.isIdleTimerDisabled = true
        setNeedsUpdateOfScreenEdgesDeferringSystemGestures()
        setNeedsUpdateOfHomeIndicatorAutoHidden()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        UIApplication.shared.isIdleTimerDisabled = false
    }

    @objc private func audioInterrupted(_ note: Notification) {
        guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              AVAudioSession.InterruptionType(rawValue: raw) == .ended else { return }
        try? AVAudioSession.sharedInstance().setActive(true)
        DispatchQueue.main.async { [weak self] in self?.bridge?.triggerWindowJSEvent(eventName: "spgaudioresume") }
    }
}

// Saves a finished picture into the Photos library with "add only" access: the app can add pictures but never sees the library.
// The system question ("Allow Sprout Park to add to your photos?") is only ever asked through `request`, which the game calls after the
// grown-up gate, so a child never meets it. `save` never asks: without permission it just answers saved: false.
@objc(SproutPhotosPlugin)
public class SproutPhotosPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SproutPhotosPlugin"
    public let jsName = "SproutPhotos"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise)
    ]

    private func name(_ s: PHAuthorizationStatus) -> String {
        switch s {
        case .authorized: return "granted"
        case .limited: return "granted"
        case .denied: return "denied"
        case .restricted: return "restricted"
        case .notDetermined: return "ask"
        @unknown default: return "denied"
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        call.resolve(["status": name(PHPhotoLibrary.authorizationStatus(for: .addOnly))])
    }

    @objc func request(_ call: CAPPluginCall) {
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { s in call.resolve(["status": self.name(s)]) }
    }

    @objc func save(_ call: CAPPluginCall) {
        guard let b64 = call.getString("data"), let data = Data(base64Encoded: b64), UIImage(data: data) != nil else {
            call.reject("not a picture"); return
        }
        let s = PHPhotoLibrary.authorizationStatus(for: .addOnly)
        guard s == .authorized || s == .limited else { call.resolve(["saved": false, "status": name(s)]); return }
        PHPhotoLibrary.shared().performChanges({
            let req = PHAssetCreationRequest.forAsset()
            let opts = PHAssetResourceCreationOptions()
            if let n = call.getString("name"), !n.isEmpty { opts.originalFilename = n }
            req.addResource(with: .photo, data: data, options: opts)
        }, completionHandler: { ok, _ in call.resolve(["saved": ok]) })
    }
}

#if DEBUG
// Only in Debug builds (the simulator tests): turn the screen and report what the window looks like. The release build has none of this.
@objc(SproutTestPlugin)
public class SproutTestPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SproutTestPlugin"
    public let jsName = "SproutTest"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "rotate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "info", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "interrupt", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resize", returnType: CAPPluginReturnPromise)
    ]

    @objc func rotate(_ call: CAPPluginCall) {
        let to = call.getString("to") ?? "portrait"
        DispatchQueue.main.async {
            guard let scene = self.bridge?.viewController?.view.window?.windowScene else { call.reject("no window"); return }
            let mask: UIInterfaceOrientationMask = to == "portrait" ? .portrait : to == "landscapeLeft" ? .landscapeLeft : to == "landscapeRight" ? .landscapeRight : .landscape
            self.bridge?.viewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
            var failed: String?
            scene.requestGeometryUpdate(.iOS(interfaceOrientations: mask)) { err in failed = err.localizedDescription }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                var o = self.describe(); if let f = failed { o["error"] = f }
                call.resolve(o)
            }
        }
    }

    @objc func info(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(self.describe()) }
    }

    // Pretends a phone call came and went (the audio session's interruption began, then ended), to check that the game gets its sound
    // back afterwards. Only the app's own handler sees this; the real WebKit audio is not interrupted.
    @objc func interrupt(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let s = AVAudioSession.sharedInstance(), key = AVAudioSessionInterruptionTypeKey
            NotificationCenter.default.post(name: AVAudioSession.interruptionNotification, object: s, userInfo: [key: AVAudioSession.InterruptionType.began.rawValue])
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                NotificationCenter.default.post(name: AVAudioSession.interruptionNotification, object: s, userInfo: [key: AVAudioSession.InterruptionType.ended.rawValue])
                call.resolve()
            }
        }
    }

    // Gives the app's window another size inside the screen (w = 0 puts it back), the way an iPad window or the other display of an
    // iPhone Duo hands the app a new size. Only the tests do this: the real app never sets its own window size.
    @objc func resize(_ call: CAPPluginCall) {
        let w = call.getDouble("w") ?? 0, h = call.getDouble("h") ?? 0
        DispatchQueue.main.async {
            guard let win = self.bridge?.viewController?.view.window, let scene = win.windowScene else { call.reject("no window"); return }
            let full = scene.coordinateSpace.bounds
            win.frame = w > 0 && h > 0 ? CGRect(x: 0, y: 0, width: min(CGFloat(w), full.width), height: min(CGFloat(h), full.height)) : full
            win.layoutIfNeeded()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { call.resolve(self.describe()) }
        }
    }

    private func describe() -> [String: Any] {
        guard let vc = bridge?.viewController, let win = vc.view.window, let scene = win.windowScene else { return [:] }
        let i = win.safeAreaInsets, b = win.bounds, sb = scene.screen.bounds
        var o: [String: Any] = [
            "window": [b.width, b.height], "screen": [sb.width, sb.height], "scale": scene.screen.scale,
            "safe": [i.top, i.right, i.bottom, i.left], "orientation": scene.interfaceOrientation.rawValue,
            "hClass": win.traitCollection.horizontalSizeClass.rawValue, "vClass": win.traitCollection.verticalSizeClass.rawValue,
            "idiom": win.traitCollection.userInterfaceIdiom.rawValue, "system": UIDevice.current.systemVersion,
            "audio": AVAudioSession.sharedInstance().category.rawValue
        ]
        if let model = ProcessInfo.processInfo.environment["SIMULATOR_MODEL_IDENTIFIER"] { o["model"] = model }
        if let name = ProcessInfo.processInfo.environment["SIMULATOR_DEVICE_NAME"] { o["device"] = name }
        return o
    }
}
#endif
