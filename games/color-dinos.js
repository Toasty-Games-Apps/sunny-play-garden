// Coloring Book: dinosaurs. Same format and rules as games/color-pictures.js (which must load first): every
// picture is plain data, sections go back to front, and every separate shape is its own colorable section.
(() => {
  const SPG = window.SPG;
  const K = SPG.pictureKit;
  const { r1, P, ell, circ, rect, poly, rpoly, spline, curve, line, leaf, compound, star, face, eye, nose, sky, ground, sun, cloud, INK } = K;
  const smile = (x, y, w, bend = 26) => ({ d: `M${P(x - w, y)}Q${P(x, y + bend)} ${P(x + w, y)}`, w: 8 });
  const cheek = (x, y) => ({ d: ell(x, y, 22, 14), f: 'rgba(255,110,140,.35)' });
  const tooth = (x, y, s = 1, down = true) => ({ d: poly(down ? [[x - 9 * s, y], [x + 9 * s, y], [x, y + 20 * s]] : [[x - 9 * s, y], [x + 9 * s, y], [x, y - 20 * s]]), f: '#fff' });
  // A leafy bush sitting on the ground at (x, y).
  const fern = (x, y, s = 1, id = 'fern') => ({ id, d: spline([[x - 95 * s, y], [x - 75 * s, y - 62 * s], [x - 20 * s, y - 95 * s], [x + 40 * s, y - 82 * s], [x + 88 * s, y - 40 * s], [x + 98 * s, y], [x, y + 12 * s]]) });
  const egg = (cx, cy, rx, ry) => spline([[cx, cy - ry], [cx + rx * .8, cy - ry * .5], [cx + rx, cy + ry * .3], [cx + rx * .5, cy + ry], [cx - rx * .5, cy + ry], [cx - rx, cy + ry * .3], [cx - rx * .8, cy - ry * .5]]);
  const plates = (list, id = 'plate') => list.map(([x, y, w, h], i) => ({ id: id + '-' + (i + 1), d: rpoly([[x - w, y + h * .5], [x, y - h * .5], [x + w, y + h * .5]], 12) }));
  const hill = (y, id = 'hill') => ({ id, d: `M0 ${y + 20}C200 ${y - 110} 420 ${y - 20} 640 ${y - 90}C800 ${y - 140} 920 ${y - 60} 1000 ${y - 100}V800H0Z` });

  const PICS = [
    {
      id: 'trex', name: 'Tyrannosaurus', group: 'dinosaurs', sections: [
        sky(), sun(150, 130), cloud(620, 130, .9), ground(660),
        fern(120, 690, 1.05, 'fern-l'), fern(900, 700, .9, 'fern-r'),
        { id: 'tail', d: spline([[360, 450], [250, 470], [120, 540], [50, 600], [150, 610], [280, 590], [380, 590]]) },
        { id: 'leg', d: ell(455, 660, 70, 100) },
        { id: 'body', d: spline([[330, 470], [390, 350], [520, 310], [620, 370], [650, 490], [610, 590], [500, 640], [390, 620], [340, 550]]) },
        { id: 'belly', d: ell(520, 530, 78, 98) },
        { id: 'spots', d: compound(circ(430, 440, 28), circ(520, 400, 26), circ(470, 510, 24)) },
        { id: 'arm', d: ell(625, 500, 30, 54, -35) },
        { id: 'head', d: spline([[590, 290], [690, 190], [830, 195], [920, 255], [935, 330], [860, 345], [760, 345], [690, 360], [615, 345]]), det: [...eye(770, 252, 20), { d: ell(905, 280, 10, 7), f: INK }, cheek(720, 318)] },
        { id: 'jaw', d: spline([[700, 350], [830, 360], [925, 340], [905, 405], [810, 440], [715, 420]]), det: [smile(790, 392, 60, 10), tooth(780, 360), tooth(830, 362, .9), tooth(880, 352, .8)] }
      ]
    },
    {
      id: 'trike', name: 'Triceratops', group: 'dinosaurs', sections: [
        sky(), sun(860, 130), cloud(250, 150), ground(650),
        fern(80, 700, .9, 'fern-l'),
        { id: 'tail', d: spline([[300, 470], [200, 480], [100, 540], [80, 590], [180, 590], [300, 580]]) },
        { id: 'legs-back', d: compound(ell(320, 660, 48, 95), ell(430, 668, 44, 88)) },
        { id: 'body', d: ell(450, 500, 230, 135) },
        { id: 'belly', d: ell(450, 560, 140, 70) },
        { id: 'legs-front', d: compound(ell(545, 668, 42, 90), ell(660, 660, 46, 95)) },
        { id: 'frill', d: spline([[690, 400], [640, 300], [700, 220], [800, 210], [880, 280], [890, 380], [840, 470], [760, 500]]), det: [...[[650, 300], [700, 235], [790, 220], [860, 285], [880, 375]].map(([x, y]) => ({ d: circ(x, y, 12), f: '#fff' }))] },
        { id: 'head', d: ell(770, 470, 120, 92), det: [...eye(800, 440, 20), cheek(740, 500), smile(790, 510, 40, 18)] },
        { id: 'horn-brow', d: rpoly([[745, 400], [730, 250], [785, 395]], 10) },
        { id: 'horn-nose', d: rpoly([[845, 470], [925, 430], [895, 500]], 10) },
        { id: 'horn-brow2', d: rpoly([[795, 395], [830, 250], [860, 402]], 10) }
      ]
    },
    {
      id: 'stego', name: 'Stegosaurus', group: 'dinosaurs', sections: [
        sky(), sun(130, 130), cloud(560, 120, .85), ground(660),
        fern(900, 700, .9, 'fern-r'),
        { id: 'tail', d: spline([[270, 500], [170, 490], [70, 520], [50, 565], [170, 575], [280, 590]]) },
        { id: 'tail-spikes', d: compound(rpoly([[130, 512], [105, 420], [170, 500]], 10), rpoly([[70, 530], [20, 450], [110, 515]], 10)) },
        { id: 'legs', d: compound(ell(300, 660, 48, 92), ell(410, 668, 44, 86), ell(610, 668, 44, 86), ell(720, 660, 48, 92)) },
        { id: 'body', d: spline([[230, 520], [300, 425], [460, 375], [620, 395], [720, 470], [780, 520], [760, 590], [600, 625], [420, 630], [280, 600]]) },
        ...plates([[330, 410, 50, 100], [420, 372, 56, 120], [520, 368, 56, 120], [610, 390, 50, 100], [690, 430, 44, 84]]),
        { id: 'head', d: ell(815, 545, 80, 62), det: [...eye(835, 530, 16), cheek(800, 565), smile(830, 575, 28, 14)] }
      ]
    },
    {
      id: 'bronto', name: 'Long-neck dinosaur', group: 'dinosaurs', sections: [
        sky(), sun(130, 140), cloud(520, 100, .8), ground(670),
        { id: 'tree-trunk', d: rect(872, 400, 56, 290) }, { id: 'tree-top', d: circ(900, 340, 105) },
        { id: 'tail', d: spline([[260, 520], [170, 560], [80, 560], [40, 600], [160, 620], [270, 590]]) },
        { id: 'legs', d: compound(ell(300, 680, 46, 82), ell(405, 690, 40, 76), ell(560, 690, 40, 76), ell(665, 680, 46, 82)) },
        { id: 'body', d: ell(470, 540, 235, 125) },
        { id: 'belly', d: ell(470, 600, 140, 55) },
        { id: 'neck', d: spline([[600, 470], [660, 380], [690, 270], [690, 170], [770, 160], [790, 250], [770, 370], [730, 480], [680, 560]]) },
        { id: 'head', d: ell(770, 145, 82, 55, -8), det: [...eye(795, 130, 15), cheek(765, 165), smile(800, 168, 25, 12)] },
        { id: 'spots', d: compound(circ(400, 500, 30), circ(500, 470, 28), circ(540, 560, 25)) }
      ]
    },
    {
      id: 'ptero', name: 'Flying dinosaur', group: 'dinosaurs', sections: [
        sky(), sun(870, 130, 62), cloud(170, 620, .8), cloud(830, 640, .9, 'cloud-2'),
        { id: 'wing-l', d: spline([[470, 350], [330, 250], [150, 230], [50, 320], [150, 320], [220, 400], [300, 380], [390, 440]]) },
        { id: 'wing-r', d: spline([[530, 350], [670, 250], [850, 230], [950, 320], [850, 320], [780, 400], [700, 380], [610, 440]]) },
        { id: 'feet', d: compound(ell(445, 625, 46, 24), ell(555, 625, 46, 24)) },
        { id: 'body', d: ell(500, 470, 82, 140) },
        { id: 'belly', d: ell(500, 500, 48, 88) },
        { id: 'crest', d: rpoly([[470, 235], [360, 160], [490, 300]], 10) },
        { id: 'head', d: ell(500, 290, 62, 56), det: [...eye(525, 282, 14), cheek(470, 312)] },
        { id: 'beak', d: rpoly([[540, 280], [740, 250], [545, 320]], 14), det: [smile(610, 296, 30, 6)] }
      ]
    },
    {
      id: 'hatch', name: 'Baby dinosaur', group: 'dinosaurs', sections: [
        sky(), sun(850, 130, 60), cloud(190, 130, .9), hill(620),
        { id: 'nest', d: ell(500, 690, 330, 80) },
        { id: 'baby', d: spline([[500, 290], [610, 340], [640, 450], [600, 560], [500, 600], [400, 560], [360, 450], [390, 340]]), det: [...face(500, 420, 140, { gap: .36 }), cheek(400, 470), cheek(600, 470)] },
        { id: 'spikes', d: compound(rpoly([[412, 322], [440, 262], [468, 322]], 6), rpoly([[472, 302], [500, 240], [528, 302]], 6), rpoly([[532, 322], [560, 262], [588, 322]], 6)) },
        { id: 'shell-low', d: `M300 560L360 500L420 570L490 500L560 570L630 500L700 560L700 600Q700 720 500 730Q300 720 300 600Z` },
        { id: 'shell-cap', d: `M170 330L230 270L290 340L350 270L400 345Q330 450 210 400Z` },
        ...[[370, 160, 30], [630, 140, 28], [260, 210, 27]].map(([x, y, r], i) => ({ id: 'spark-' + (i + 1), d: star(x, y, r, r * .45) }))
      ]
    },
    {
      id: 'volcano', name: 'Volcano land', group: 'dinosaurs', sections: [
        sky(), sun(120, 120, 62), cloud(820, 150, .9),
        { id: 'smoke', d: compound(ell(420, 190, 64, 46), ell(545, 105, 56, 40)) },
        { id: 'mountain', d: rpoly([[170, 700], [410, 260], [590, 260], [830, 700]], 24) },
        { id: 'lava', d: spline([[410, 262], [500, 235], [590, 262], [560, 330], [530, 420], [500, 330], [470, 470], [440, 330]]) },
        { id: 'ground', d: `M0 690C240 640 480 720 720 680C860 656 950 690 1000 670V800H0Z` },
        fern(90, 720, 1, 'fern-l'), fern(930, 730, .9, 'fern-r'),
        { id: 'dino', d: ell(760, 690, 100, 65), det: [] },
        { id: 'dino-head', d: ell(860, 640, 58, 48), det: [...eye(880, 630, 12), cheek(845, 660)] },
        { id: 'dino-legs', d: compound(ell(715, 752, 30, 38), ell(800, 752, 30, 36)) }
      ]
    },
    {
      id: 'plesio', name: 'Sea dinosaur', group: 'dinosaurs', sections: [
        sky(), sun(850, 120, 62), cloud(200, 150, .9),
        { id: 'sea', d: `M0 470C150 440 300 500 450 470C600 440 780 500 1000 460V800H0Z` },
        { id: 'neck', d: spline([[470, 520], [540, 420], [560, 300], [600, 250], [690, 250], [700, 300], [660, 360], [650, 470], [660, 560]]) },
        { id: 'head', d: ell(690, 240, 82, 52, -6), det: [...eye(715, 228, 15), cheek(680, 262), smile(730, 262, 26, 12)] },
        { id: 'body', d: ell(500, 560, 190, 90) },
        { id: 'flippers', d: compound(ell(420, 640, 28, 66, -40), ell(600, 645, 28, 66, 40)) },
        { id: 'tail', d: spline([[330, 560], [220, 600], [130, 590], [90, 640], [220, 650], [330, 620]]) },
        { id: 'waves', d: `M0 600C110 570 220 630 330 600C440 570 550 630 660 600C770 570 880 630 1000 600V800H0Z` },
        { id: 'fish', d: spline([[740, 700], [800, 660], [870, 700], [800, 740]]) }
      ]
    },
    {
      id: 'ankylo', name: 'Armor dinosaur', group: 'dinosaurs', sections: [
        sky(), sun(130, 130, 62), cloud(600, 130, .85), ground(670),
        { id: 'tail', d: spline([[260, 540], [170, 560], [90, 580], [70, 620], [170, 625], [270, 610]]) },
        { id: 'club', d: circ(85, 590, 52) },
        { id: 'legs', d: compound(ell(320, 690, 46, 70), ell(430, 700, 42, 64), ell(590, 700, 42, 64), ell(700, 690, 46, 70)) },
        { id: 'body', d: ell(490, 550, 250, 120) },
        { id: 'shell', d: spline([[260, 520], [330, 420], [490, 390], [650, 420], [730, 520], [600, 560], [490, 570], [370, 560]]) },
        ...[[360, 470, 40, 30], [490, 450, 44, 34], [620, 470, 40, 30]].map(([x, y, rx, ry], i) => ({ id: 'armor-' + (i + 1), d: ell(x, y, rx, ry) })),
        { id: 'head', d: ell(765, 575, 85, 64), det: [...eye(790, 558, 16), cheek(755, 600), smile(795, 605, 30, 14)] }
      ]
    }
  ];

  // Add the dinosaurs to the book.
  for (const pic of PICS) SPG.pictures.push(K.explode(pic));   // every separate shape (each leg, each spot) is its own section; old saves keep their colors through `alias`
  SPG.pictureGroups.push({ id: 'dinosaurs', name: 'Dinosaurs', theme: 'dino', tint: '#dff2d2', edge: '#8fcf7a', emblem: 'trex', demo: [['sky', 6], ['ground', 4], ['body', 4], ['belly', 7], ['head', 4], ['jaw', 4]] });
})();
