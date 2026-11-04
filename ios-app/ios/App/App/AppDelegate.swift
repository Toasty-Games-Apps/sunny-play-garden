import UIKit
import AVFoundation
import Capacitor

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // The spoken instructions are how a child who cannot read yet knows what to do, so the game's sound plays even when the
        // ring/silent switch is on silent (the "playback" kind of audio). Grown-ups can still turn sound, music and the voice off in
        // Grown-ups > Sound, and the volume buttons work as usual. Nothing plays in the background: there is no background audio mode.
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
        return true
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
