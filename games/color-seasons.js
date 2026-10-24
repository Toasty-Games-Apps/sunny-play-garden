// Coloring Book: seasonal pictures (Halloween, Thanksgiving and fall, Christmas, then the holiday collections below). Same format and rules as
// games/color-pictures.js, which must load first. Each picture has a `group` matching SPG.pictureGroups.
(() => {
  const SPG = window.SPG;
  const K = SPG.pictureKit;
  const { r1, P, ell, circ, rect, poly, rpoly, spline, curve, line, polar, leaf, strip, dome, drop, star, compound, ring, crescent, face, eye, nose, sky, ground, cloud, INK } = K;
  const stars = (list, id = 'stars') => ({ id, d: compound(...list.map(([x, y, r]) => star(x, y, r, r * .46))) });
  // A full moon: the moon itself plus three craters that can each be colored on their own.
  const moonFull = (x, y, r, id = 'moon') => [
    { id, d: circ(x, y, r) },
    { id: id + '-c1', d: circ(x - r * .3, y - r * .22, r * .28) },
    { id: id + '-c2', d: circ(x + r * .3, y + r * .3, r * .28) },
    { id: id + '-c3', d: circ(x + r * .36, y - r * .42, r * .26) }
  ];
  const moonCres = (x, y, r, id = 'moon') => ({ id, d: crescent(x, y, r) });
  const hill = (y, id = 'ground', flip = false) => ({ id, d: flip ? `M0 ${y - 30}C260 ${y + 40} 620 ${y - 70} 1000 ${y + 10}V800H0Z` : `M0 ${y}C240 ${y - 80} 600 ${y + 50} 1000 ${y - 40}V800H0Z` });
  // A five-part pumpkin (like the garden one) centered at (cx, cy), scaled by s.
  const pumpkin = (cx, cy, s, pre = '') => [
    { id: pre + 'seg-l2', d: ell(cx - 160 * s, cy + 10 * s, 112 * s, 165 * s) }, { id: pre + 'seg-r2', d: ell(cx + 160 * s, cy + 10 * s, 112 * s, 165 * s) },
    { id: pre + 'seg-l', d: ell(cx - 85 * s, cy + 5 * s, 112 * s, 178 * s) }, { id: pre + 'seg-r', d: ell(cx + 85 * s, cy + 5 * s, 112 * s, 178 * s) },
    { id: pre + 'seg-m', d: ell(cx, cy, 100 * s, 185 * s) }
  ];
  const carved = (cx, cy, s) => [
    { d: rpoly([[cx - 80 * s, cy - 20 * s], [cx - 25 * s, cy - 20 * s], [cx - 52 * s, cy - 80 * s]], 8 * s), f: INK }, { d: rpoly([[cx + 25 * s, cy - 20 * s], [cx + 80 * s, cy - 20 * s], [cx + 52 * s, cy - 80 * s]], 8 * s), f: INK },
    { d: rpoly([[cx - 14 * s, cy + 6 * s], [cx + 14 * s, cy + 6 * s], [cx, cy + 32 * s]], 5 * s), f: INK },
    { d: poly([[cx - 82 * s, cy + 48 * s], [cx - 48 * s, cy + 40 * s], [cx - 26 * s, cy + 66 * s], [cx, cy + 40 * s], [cx + 26 * s, cy + 66 * s], [cx + 48 * s, cy + 40 * s], [cx + 82 * s, cy + 48 * s], [cx + 56 * s, cy + 98 * s], [cx, cy + 112 * s], [cx - 56 * s, cy + 98 * s]]), f: INK }
  ];
  // A little bat: two wings and a body, each colorable.
  const bat = (x, y, s, pre = '') => [
    { id: pre + 'wing-l', d: rpoly([[x - 24 * s, y - 4 * s], [x - 70 * s, y - 50 * s], [x - 160 * s, y - 38 * s], [x - 128 * s, y + 4 * s], [x - 168 * s, y + 38 * s], [x - 96 * s, y + 32 * s], [x - 58 * s, y + 58 * s], [x - 30 * s, y + 28 * s]], 10 * s) },
    { id: pre + 'wing-r', d: rpoly([[x + 24 * s, y - 4 * s], [x + 70 * s, y - 50 * s], [x + 160 * s, y - 38 * s], [x + 128 * s, y + 4 * s], [x + 168 * s, y + 38 * s], [x + 96 * s, y + 32 * s], [x + 58 * s, y + 58 * s], [x + 30 * s, y + 28 * s]], 10 * s) },
    { id: pre + 'body', d: ell(x, y + 6 * s, 30 * s + 14, 42 * s + 16) }
  ];
  // A wrapped candy as one shape.
  const wrapped = (cx, cy, w = 95, h = 38, rot = 0) => {
    const a = rot * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), T = (x, y) => P(cx + x * c - y * sn, cy + x * sn + y * c);
    return `M${T(-w, -h)}L${T(-w * .58, -h * .42)}Q${T(0, -h * 1.15)} ${T(w * .58, -h * .42)}L${T(w, -h)}L${T(w * .86, 0)}L${T(w, h)}L${T(w * .58, h * .42)}Q${T(0, h * 1.15)} ${T(-w * .58, h * .42)}L${T(-w, h)}L${T(-w * .86, 0)}Z`;
  };
  const MAPLE = [[0, -1], [.16, -.62], [.46, -.72], [.4, -.3], [.86, -.28], [.6, .04], [.92, .34], [.46, .34], [.5, .56], [.12, .42], [.08, .95], [-.08, .95], [-.12, .42], [-.5, .56], [-.46, .34], [-.92, .34], [-.6, .04], [-.86, -.28], [-.4, -.3], [-.46, -.72], [-.16, -.62]];
  const maple = (cx, cy, R, rot = 0) => {
    const a = rot * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
    return rpoly(MAPLE.map(([x, y]) => [cx + (x * c - y * sn) * R, cy + (x * sn + y * c) * R]), R * .07);
  };
  // Thick line through points, as one closed outline (for branches, candy canes, runners).
  const thick = (pts, w) => {
    const L = [], R = [];
    pts.forEach((q, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      L.push([q[0] - dy / l * w, q[1] + dx / l * w]); R.push([q[0] + dy / l * w, q[1] - dx / l * w]);
    });
    return poly([...L, ...R.reverse()]);
  };
  const arcPts = (cx, cy, r, a0, a1, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  const fir = (cx, top, bottom, half, id) => ({ id, d: rpoly([[cx - half, bottom], [cx, top], [cx + half, bottom]], 30) });
  const bowPath = (x, y, s = 1) => spline([[0, 0], [-45, -55], [-100, -45], [-105, 12], [-55, 32], [0, 10], [55, 32], [105, 12], [100, -45], [45, -55]].map(([a, b]) => [x + a * s, y + b * s]));
  const cross = (cx, cy, w, h, t) => poly([[cx - t, cy - h], [cx + t, cy - h], [cx + t, cy - t], [cx + w, cy - t], [cx + w, cy + t], [cx + t, cy + t], [cx + t, cy + h], [cx - t, cy + h], [cx - t, cy + t], [cx - w, cy + t], [cx - w, cy - t], [cx - t, cy - t]]);
  const eyeWhite = (x, y, r, look = 0) => [{ d: circ(x, y, r), f: '#fff' }, { d: circ(x + look, y + r * .1, r * .5), f: INK }, { d: circ(x + look - r * .18, y - r * .15, r * .18), f: '#fff' }];

  const P1 = [
    {
      id: 'jack', name: 'Jack-o-lantern', group: 'halloween', sections: [
        sky(), stars([[120, 110, 44], [300, 70, 40], [470, 130, 42], [650, 60, 38], [180, 260, 38]]), ...moonFull(840, 150, 92), hill(640),
        { id: 'stem', d: rect(468, 285, 64, 120, 16) },
        ...pumpkin(500, 545, 1.05),
        { id: 'vine', d: leaf(545, 335, 730, 250, 60) }
      ].map(sec => sec.id === 'seg-m' ? { ...sec, det: carved(500, 545, 1.05) } : sec)
    },
    {
      id: 'ghost', name: 'Friendly ghost', group: 'halloween', sections: [
        sky(), stars([[110, 100, 44], [330, 60, 38], [640, 90, 42], [900, 300, 40]]), moonCres(790, 170, 105), hill(640),
        { id: 'stones', d: compound(`M150 640V520A55 55 0 0 1 260 520V640Z`, `M740 660V560A50 50 0 0 1 840 560V660Z`), det: [{ d: line(205, 540, 205, 590), w: 8 }, { d: line(180, 565, 230, 565), w: 8 }] },
        { id: 'mini', d: ell(150, 720, 80, 62), det: [{ d: ell(125, 705, 8, 12), f: INK }, { d: ell(175, 705, 8, 12), f: INK }] },
        {
          id: 'ghost', d: `M320 660V380A180 180 0 0 1 680 380V660Q650 610 610 660Q570 710 530 660Q500 620 470 660Q430 710 390 660Q355 620 320 660Z`,
          det: [...eye(430, 390, 26), ...eye(570, 390, 26), { d: ell(500, 470, 34, 44), f: INK }, { d: ell(500, 480, 20, 22), f: '#ff8aa3' }]
        },
        { id: 'bowtie', d: compound(rpoly([[500, 590], [410, 545], [410, 635]], 16), rpoly([[500, 590], [590, 545], [590, 635]], 16)) },
        ...bat(300, 200, .6, 'bat-')
      ]
    },
    {
      id: 'blackcat', name: 'Black cat', group: 'halloween', sections: [
        sky(), stars([[110, 90, 44], [300, 160, 38], [660, 70, 42], [520, 230, 36]]), ...moonFull(810, 160, 96), hill(600),
        { id: 'rails', d: compound(rect(0, 556, 1000, 54, 14), rect(0, 656, 1000, 54, 14)) },
        { id: 'pickets', d: compound(...[60, 250, 640, 830].map(x => `M${x} 760V520Q${x + 45} 460 ${x + 90} 520V760Z`)) },
        { id: 'tail', d: spline([[600, 540], [690, 500], [760, 420], [740, 330], [790, 310], [820, 400], [780, 510], [690, 580]]) },
        { id: 'body', d: ell(500, 500, 130, 145) },
        { id: 'ears', d: compound(rpoly([[385, 290], [380, 150], [480, 230]], 20), rpoly([[615, 290], [620, 150], [520, 230]], 20)) },
        { id: 'head', d: ell(500, 330, 130, 118), det: [...eyeWhite(455, 320, 27), ...eyeWhite(545, 320, 27), nose(500, 360, 14), { d: `M${P(475, 385)}Q${P(500, 402)} ${P(500, 378)}Q${P(500, 402)} ${P(525, 385)}`, w: 7 }, { d: line(390, 350, 335, 340), w: 6 }, { d: line(390, 372, 338, 385), w: 6 }, { d: line(610, 350, 665, 340), w: 6 }, { d: line(610, 372, 662, 385), w: 6 }] },
        { id: 'mini', d: ell(180, 720, 82, 66) },
        ...bat(880, 250, .5, 'bat-')
      ]
    },
    {
      id: 'bat', name: 'Little bat', group: 'halloween', sections: [
        sky(), stars([[110, 100, 44], [340, 190, 40], [700, 90, 44], [900, 290, 40], [90, 420, 40]]), moonCres(820, 140, 100),
        { id: 'cloud-l', d: cloud(180, 560, 1.4).d }, { id: 'cloud-r', d: cloud(830, 600, 1.3).d },
        hill(690),
        { id: 'wings', d: compound(rpoly([[440, 420], [330, 320], [140, 320], [80, 420], [170, 430], [150, 520], [260, 490], [330, 570], [410, 490]], 28), rpoly([[560, 420], [670, 320], [860, 320], [920, 420], [830, 430], [850, 520], [740, 490], [670, 570], [590, 490]], 28)) },
        { id: 'ears', d: compound(rpoly([[440, 330], [430, 220], [500, 290]], 14), rpoly([[560, 330], [570, 220], [500, 290]], 14)) },
        { id: 'body', d: ell(500, 450, 100, 130), det: [{ d: ell(500, 520, 52, 60), f: null, w: 7 }] },
        { id: 'face', d: ell(500, 350, 96, 82), det: [...eyeWhite(465, 345, 24), ...eyeWhite(535, 345, 24), { d: `M${P(480, 385)}L${P(485, 405)}L${P(497, 388)}`, w: 6 }, { d: `M${P(520, 385)}L${P(515, 405)}L${P(503, 388)}`, w: 6 }, { d: `M${P(478, 384)}Q${P(500, 396)} ${P(522, 384)}`, w: 7 }] },
        ...bat(200, 170, .5, 'small-')
      ]
    },
    {
      id: 'cauldron', name: 'Cauldron', group: 'halloween', sections: [
        sky(), stars([[110, 100, 44], [330, 70, 40], [650, 110, 42], [880, 250, 38]]), ...moonFull(150, 260, 86), hill(650),
        { id: 'logs', d: compound(ell(365, 730, 105, 28, 12), ell(635, 730, 105, 28, -12)) },
        { id: 'flames', d: compound(rpoly([[330, 730], [370, 600], [420, 730]], 22), rpoly([[450, 730], [500, 570], [550, 730]], 22), rpoly([[580, 730], [630, 610], [670, 730]], 22)) },
        { id: 'legs', d: compound(rect(310, 660, 60, 60, 14), rect(630, 660, 60, 60, 14), rect(470, 675, 60, 50, 14)) },
        { id: 'cauldron', d: `M270 470Q250 700 500 700Q750 700 730 470Z`, det: [{ d: `M${P(350, 600)}Q${P(360, 650)} ${P(420, 665)}`, w: 8 }] },
        { id: 'rim', d: ell(500, 470, 246, 56) },
        { id: 'potion', d: ell(500, 470, 214, 38) },
        { id: 'bubbles', d: compound(circ(420, 340, 46), circ(560, 290, 58), circ(650, 400, 40)) },
        { id: 'star', d: star(830, 480, 60, 28) }
      ]
    },
    {
      id: 'hauntedhouse', name: 'Haunted house', group: 'halloween', sections: [
        sky(), stars([[110, 100, 44], [320, 70, 40], [540, 120, 38], [930, 470, 36]]), ...moonFull(800, 150, 90), hill(650),
        { id: 'tree', d: `M60 700L80 480L40 380L90 400L100 330L140 360L160 300L190 380L170 470L190 700Z` },
        { id: 'tower', d: rect(560, 290, 120, 410) },
        { id: 'tower-roof', d: rpoly([[545, 300], [620, 160], [695, 300]], 10) },
        { id: 'tower-win', d: `M595 420V375A25 25 0 0 1 645 375V420Z`, det: [{ d: line(620, 352, 620, 420), w: 6 }] },
        { id: 'house', d: rect(240, 430, 340, 270) },
        { id: 'roof', d: rpoly([[212, 440], [410, 270], [608, 440]], 10) },
        { id: 'door', d: `M360 700V610A50 50 0 0 1 460 610V700Z`, det: [{ d: circ(446, 655, 7), f: INK }] },
        { id: 'windows', d: rect(272, 480, 70, 80, 12), det: [{ d: line(307, 480, 307, 560), w: 6 }, { d: line(272, 520, 342, 520), w: 6 }] },
        { id: 'window-r', d: rect(478, 480, 70, 80, 12), det: [{ d: line(513, 480, 513, 560), w: 6 }, { d: line(478, 520, 548, 520), w: 6 }] },
        { id: 'path', d: `M360 700L460 700L620 800L220 800Z` },
        ...bat(810, 310, .55, 'bat-')
      ]
    },
    {
      id: 'owl', name: 'Night owl', group: 'halloween', sections: [
        sky(), stars([[400, 70, 44], [600, 150, 38], [560, 270, 36], [900, 90, 40]]), moonCres(190, 180, 110),
        { id: 'trunk', d: `M700 800Q740 500 720 250Q760 200 820 250Q850 500 880 800Z` },
        { id: 'branch', d: `M0 640Q300 610 760 650L770 720Q300 700 0 720Z` },
        { id: 'tail', d: rpoly([[440, 690], [500, 780], [560, 690]], 12) },
        { id: 'body', d: ell(500, 520, 165, 190) },
        { id: 'belly', d: ell(500, 570, 100, 130), det: [{ d: curve([[450, 520], [500, 545], [550, 520]]), w: 7 }, { d: curve([[440, 580], [500, 605], [560, 580]]), w: 7 }, { d: curve([[450, 640], [500, 660], [550, 640]]), w: 7 }] },
        { id: 'wings', d: compound(ell(345, 540, 55, 130, 10), ell(655, 540, 55, 130, -10)) },
        { id: 'head', d: ell(500, 360, 150, 118) },
        { id: 'tufts', d: compound(rpoly([[365, 300], [345, 200], [440, 260]], 14), rpoly([[635, 300], [655, 200], [560, 260]], 14)) },
        { id: 'eyes', d: compound(circ(440, 360, 60), circ(560, 360, 60)), det: [...eyeWhite(440, 360, 34, 4), ...eyeWhite(560, 360, 34, -4)] },
        { id: 'beak', d: rpoly([[470, 405], [530, 405], [500, 470]], 14) }
      ]
    },
    {
      id: 'candy', name: 'Treats', group: 'halloween', sections: [
        sky(), stars([[110, 100, 44], [330, 70, 40], [560, 130, 40], [900, 90, 42]]), moonCres(760, 170, 100), hill(600),
        { id: 'candy-corn', d: compound(rpoly([[130, 730], [230, 730], [180, 600]], 20), rpoly([[290, 790], [400, 790], [345, 660]], 20)) },
        { id: 'lolly-stick', d: rect(870, 520, 46, 240, 16) },
        { id: 'lolly', d: circ(893, 440, 82), det: [{ d: curve([[893, 440], [922, 440], [922, 410], [882, 400], [848, 440], [882, 488], [950, 466]]), w: 9 }] },
        { id: 'bucket', d: `M330 400L730 400L690 720Q530 760 370 720Z`, det: [{ d: `M${P(350, 405)}Q${P(530, 130)} ${P(710, 405)}`, w: 10 }, { d: rpoly([[430, 520], [490, 520], [460, 470]], 6), f: INK }, { d: rpoly([[570, 520], [630, 520], [600, 470]], 6), f: INK }, { d: poly([[430, 580], [460, 570], [485, 595], [530, 570], [555, 595], [580, 570], [630, 580], [600, 640], [530, 650], [460, 640]]), f: INK }] },
        { id: 'wrap-a', d: wrapped(190, 480, 90, 36, -12) },
        { id: 'wrap-b', d: wrapped(700, 790, 92, 36, 8) },
        { id: 'wrap-c', d: wrapped(140, 340, 80, 32, 14) }
      ]
    },
    {
      id: 'monster', name: 'Friendly monster', group: 'halloween', sections: [
        sky(), stars([[110, 100, 44], [330, 60, 40], [640, 80, 42], [910, 200, 38]]), moonCres(150, 250, 90), hill(660),
        { id: 'horns', d: compound(rpoly([[380, 230], [340, 90], [450, 180]], 16), rpoly([[620, 230], [660, 90], [550, 180]], 16)) },
        { id: 'arms', d: compound(ell(275, 520, 60, 120, 25), ell(725, 520, 60, 120, -25)) },
        { id: 'body', d: spline([[500, 190], [640, 220], [720, 360], [730, 560], [660, 700], [500, 730], [340, 700], [270, 560], [280, 360], [360, 220]]) },
        { id: 'belly', d: ell(500, 610, 130, 100) },
        { id: 'eyes', d: compound(circ(430, 340, 70), circ(570, 340, 70)), det: [...eyeWhite(430, 340, 40, 5), ...eyeWhite(570, 340, 40, -5)] },
        { id: 'mouth', d: `M410 470Q500 570 590 470Q500 510 410 470Z`, det: [{ d: rpoly([[430, 480], [455, 480], [442, 505]], 3), f: '#fff' }, { d: rpoly([[545, 480], [570, 480], [557, 505]], 3), f: '#fff' }] },
        { id: 'feet', d: compound(ell(410, 735, 70, 34), ell(590, 735, 70, 34)) },
        { id: 'spots', d: compound(circ(330, 620, 42), circ(690, 420, 40)) }
      ]
    },
    {
      id: 'witchbunny', name: 'Bunny witch', group: 'halloween', sections: [
        sky(), stars([[110, 100, 44], [330, 70, 40], [640, 60, 38], [910, 210, 40]]), moonCres(820, 150, 96), hill(650),
        { id: 'cape', d: rpoly([[360, 470], [640, 470], [760, 740], [240, 740]], 30) },
        { id: 'ears', d: compound(ell(345, 250, 44, 110, -30), ell(655, 250, 44, 110, 30)) },
        { id: 'body', d: ell(500, 650, 140, 120) },
        { id: 'head', d: ell(500, 440, 168, 150), det: [...face(500, 450, 150), nose(500, 480, 18)] },
        { id: 'brim', d: ell(500, 340, 210, 42, -4) },
        { id: 'hat', d: rpoly([[385, 335], [455, 100], [520, 60], [600, 335]], 30) },
        { id: 'band', d: rect(392, 284, 202, 54, 10) },
        { id: 'bucket', d: `M690 640L810 640L790 770L710 770Z` },
        { id: 'star', d: star(150, 300, 50, 24) }
      ]
    }
  ];
  for (const p of P1) SPG.pictures.push(K.explode(p));

  const P2 = [
    {
      id: 'turkey', name: 'Turkey', group: 'thanksgiving', sections: [
        sky(), hill(670),
        ...[-72, 72, -38, 38, 0].map((ang, i) => ({ id: 'o' + (i + 1), d: ell(500 + Math.sin(ang * Math.PI / 180) * 225, 560 - Math.cos(ang * Math.PI / 180) * 225, 74, 215, ang), det: [{ d: line(500 + Math.sin(ang * Math.PI / 180) * 90, 560 - Math.cos(ang * Math.PI / 180) * 90, 500 + Math.sin(ang * Math.PI / 180) * 330, 560 - Math.cos(ang * Math.PI / 180) * 330), w: 6 }] })),
        ...[-36, 36, 0].map((ang, i) => ({ id: 'i' + (i + 1), d: ell(500 + Math.sin(ang * Math.PI / 180) * 140, 570 - Math.cos(ang * Math.PI / 180) * 140, 56, 135, ang) })),
        { id: 'feet', d: compound(ell(420, 760, 62, 28), ell(580, 760, 62, 28)) },
        { id: 'body', d: ell(500, 620, 165, 150) },
        { id: 'wing', d: ell(410, 630, 62, 95, -12) },
        { id: 'head', d: ell(500, 455, 72, 82), det: [...eye(472, 440, 10), ...eye(528, 440, 10)] },
        { id: 'beak', d: rpoly([[468, 464], [532, 464], [500, 522]], 10) },
        { id: 'wattle', d: drop(500, 545, 26) },
        { id: 'leaves', d: compound(maple(130, 150, 70, 10), maple(870, 210, 66, 30), maple(880, 110, 56, 0)) }
      ]
    },
    {
      id: 'pie', name: 'Pumpkin pie', group: 'thanksgiving', sections: [
        { id: 'wall', d: rect(0, 0, 1000, 540) },
        { id: 'frame', d: rect(600, 70, 320, 290, 18) },
        { id: 'panes', d: compound(rect(624, 96, 128, 238, 8), rect(768, 96, 128, 238, 8)), },
        { id: 'table', d: rect(0, 500, 1000, 300) },
        { id: 'mug-handle', d: ring(215, 470, 46, 26) },
        { id: 'mug', d: rect(90, 390, 128, 140, 24), det: [{ d: curve([[110, 350], [130, 320], [110, 290]]), w: 8 }, { d: curve([[160, 350], [180, 320], [160, 290]]), w: 8 }] },
        { id: 'plate', d: ell(400, 660, 300, 105) },
        { id: 'crust', d: ell(400, 640, 255, 88) },
        { id: 'filling', d: ell(400, 632, 205, 64) },
        { id: 'cream', d: compound(circ(322, 628, 32), circ(400, 610, 34), circ(478, 628, 32)) },
        { id: 'plate-2', d: ell(830, 690, 150, 56) },
        { id: 'slice', d: rpoly([[750, 690], [900, 650], [860, 720]], 12) },
        { id: 'mini', d: ell(830, 470, 60, 50) }
      ]
    },
    {
      id: 'cornucopia', name: 'Cornucopia', group: 'thanksgiving', sections: [
        sky(), hill(680),
        { id: 'horn', d: spline([[110, 650], [240, 560], [400, 470], [560, 390], [700, 320], [800, 380], [820, 500], [740, 600], [560, 690], [370, 730], [200, 710]]), det: [{ d: curve([[180, 640], [300, 560], [450, 500], [600, 430]]), w: 7 }, { d: curve([[230, 690], [380, 640], [520, 590], [650, 520]]), w: 7 }] },
        { id: 'mouth', d: ell(755, 420, 62, 118, 25) },
        { id: 'pumpkin', d: ell(880, 590, 86, 70) },
        { id: 'corn', d: ell(660, 250, 46, 110, 25) },
        { id: 'husk', d: compound(leaf(690, 320, 790, 400, 26), leaf(660, 330, 740, 440, 26)) },
        { id: 'apple', d: circ(820, 300, 66), det: [{ d: curve([[820, 236], [824, 210], [842, 196]]), w: 9 }] },
        { id: 'pear', d: spline([[520, 300], [562, 335], [600, 400], [570, 450], [500, 450], [465, 400], [490, 335]]) },
        { id: 'grapes', d: compound(circ(620, 500, 36), circ(700, 505, 36), circ(660, 568, 36), circ(580, 570, 36)) },
        { id: 'leaves', d: compound(maple(140, 250, 82, 5), maple(320, 150, 70, 25), maple(900, 150, 64, 0)) }
      ]
    },
    {
      id: 'falltree', name: 'Autumn tree', group: 'thanksgiving', sections: [
        sky(), { id: 'sun', d: circ(170, 540, 110) }, hill(560, 'hill-far'), hill(690, 'hill', true),
        { id: 'trunk', d: `M430 800Q455 600 440 470Q390 430 320 400L350 365Q415 405 465 440Q465 380 435 300L478 290Q510 365 520 430Q590 385 665 340L688 372Q605 425 545 470Q555 600 585 800Z` },
        { id: 'crown-back', d: ell(505, 300, 330, 190) },
        { id: 'crown-l', d: ell(330, 310, 170, 140) },
        { id: 'crown-r', d: ell(690, 310, 170, 140) },
        { id: 'crown-top', d: ell(505, 190, 200, 130) },
        { id: 'falling', d: compound(maple(200, 500, 56, 5), maple(760, 520, 52, 20), maple(880, 400, 50, 0), maple(150, 400, 46, 30)) },
        { id: 'pile', d: ell(820, 745, 170, 58) }
      ]
    },
    {
      id: 'squirrel', name: 'Squirrel', group: 'thanksgiving', sections: [
        sky(), { id: 'trunk', d: rect(30, 0, 200, 800, 24), det: [{ d: curve([[90, 100], [110, 200], [90, 300]]), w: 8 }, { d: curve([[160, 380], [140, 480], [170, 580]]), w: 8 }] },
        hill(650),
        { id: 'pile', d: ell(820, 745, 190, 62) },
        { id: 'mushroom-stem', d: rect(150, 670, 60, 80, 16) },
        { id: 'mushroom-cap', d: `M95 685A85 75 0 0 1 265 685Z`, det: [{ d: circ(150, 655, 10), f: '#fff' }, { d: circ(215, 645, 8), f: '#fff' }] },
        { id: 'tail', d: spline([[600, 690], [720, 660], [800, 560], [790, 430], [720, 350], [650, 380], [690, 450], [680, 540], [590, 600]]) },
        { id: 'body', d: ell(500, 610, 125, 150) },
        { id: 'belly', d: ell(500, 640, 74, 112) },
        { id: 'ears', d: compound(rpoly([[420, 340], [410, 240], [480, 300]], 10), rpoly([[590, 340], [600, 240], [530, 300]], 10)) },
        { id: 'head', d: ell(505, 415, 108, 96), det: [...eye(465, 400, 13), ...eye(545, 400, 13), nose(505, 430, 16), { d: `M${P(482, 455)}Q${P(505, 472)} ${P(528, 455)}`, w: 8 }] },
        { id: 'acorn', d: ell(505, 560, 58, 70) },
        { id: 'acorn-cap', d: `M440 545A65 55 0 0 1 570 545Z` },
        { id: 'leaves', d: compound(maple(360, 150, 62, 5), maple(760, 130, 60, 25), maple(620, 240, 52, 0)) }
      ]
    },
    {
      id: 'scarecrow', name: 'Scarecrow', group: 'thanksgiving', sections: [
        sky(), { id: 'sun', d: circ(850, 130, 80) }, hill(540, 'field'),
        { id: 'corn', d: compound(leaf(90, 780, 60, 330, 46), leaf(190, 780, 240, 380, 46), leaf(820, 780, 780, 350, 46), leaf(915, 780, 950, 420, 46)) },
        { id: 'post', d: rect(468, 350, 64, 450, 10) },
        { id: 'arms', d: rect(200, 430, 600, 64, 30) },
        { id: 'shirt', d: rpoly([[380, 420], [620, 420], [655, 660], [345, 660]], 34), det: [{ d: rect(520, 520, 80, 80, 6), w: 7 }, { d: line(536, 560, 584, 560), w: 5 }] },
        { id: 'straw', d: compound(rpoly([[130, 400], [210, 440], [130, 480], [80, 440]], 12), rpoly([[870, 400], [790, 440], [870, 480], [920, 440]], 12), rpoly([[380, 700], [460, 740], [400, 800], [340, 760]], 12), rpoly([[620, 700], [540, 740], [600, 800], [660, 760]], 12)) },
        { id: 'head', d: circ(500, 320, 100), det: [{ d: circ(465, 305, 10), f: INK }, { d: circ(535, 305, 10), f: INK }, { d: `M${P(450, 360)}Q${P(500, 395)} ${P(550, 360)}`, w: 8 }, { d: line(470, 366, 470, 382), w: 6 }, { d: line(500, 372, 500, 390), w: 6 }, { d: line(530, 366, 530, 382), w: 6 }] },
        { id: 'brim', d: ell(500, 248, 160, 32) },
        { id: 'hat', d: rpoly([[418, 242], [438, 100], [562, 100], [582, 242]], 20) },
        { id: 'band', d: rect(422, 194, 156, 50, 8) },
        { id: 'pumpkins', d: compound(ell(300, 750, 90, 66), ell(720, 755, 100, 70)) },
        { id: 'crow', d: spline([[700, 200], [760, 170], [830, 190], [890, 220], [830, 240], [770, 270], [720, 250]]), det: [...eye(815, 205, 8)] }
      ]
    },
    {
      id: 'bearfall', name: 'Bear and apples', group: 'thanksgiving', sections: [
        sky(), { id: 'sun', d: circ(850, 120, 74) }, hill(650),
        { id: 'trunk', d: rect(60, 300, 100, 500, 16) },
        { id: 'crown', d: ell(110, 250, 150, 130) },
        { id: 'ears', d: compound(circ(345, 235, 58), circ(655, 235, 58)) },
        { id: 'body', d: ell(500, 640, 170, 150) },
        { id: 'belly', d: ell(500, 660, 105, 100) },
        { id: 'head', d: ell(500, 400, 185, 165), det: face(500, 385, 168) },
        { id: 'muzzle', d: ell(500, 468, 80, 60), det: [nose(500, 446, 25), { d: `M${P(474, 490)}Q${P(500, 510)} ${P(526, 490)}`, w: 8 }] },
        { id: 'scarf', d: spline([[350, 545], [500, 590], [650, 545], [680, 600], [500, 640], [320, 600]]) },
        { id: 'basket', d: rpoly([[300, 640], [700, 640], [660, 780], [340, 780]], 24), det: [{ d: `M${P(330, 640)}Q${P(500, 470)} ${P(670, 640)}`, w: 10 }, { d: line(330, 690, 670, 690), w: 6 }, { d: line(340, 735, 660, 735), w: 6 }] },
        { id: 'apples', d: compound(circ(400, 640, 48), circ(500, 625, 50), circ(600, 640, 48)) },
        { id: 'leaves', d: compound(maple(300, 120, 60, 5), maple(650, 90, 56, 25)) }
      ]
    },
    {
      id: 'leafpile', name: 'Leaf pile', group: 'thanksgiving', sections: [
        sky(), { id: 'trees', d: compound(rect(90, 150, 90, 500, 14), rect(820, 100, 100, 550, 14)) },
        hill(600),
        { id: 'pile', d: ell(500, 700, 440, 130) },
        { id: 'spikes', d: poly([[290, 700], ...Array.from({ length: 21 }, (_, i) => { const a = Math.PI + i * Math.PI / 20 * 1.02, r = i % 2 ? 190 : 250; return [490 + Math.cos(a) * r * 1.1, 640 + Math.sin(a) * r * .95]; }), [720, 700]]) },
        { id: 'face', d: ell(500, 640, 125, 105), det: [...eye(465, 620, 14), ...eye(535, 620, 14), nose(500, 660, 20), { d: `M${P(476, 695)}Q${P(500, 712)} ${P(524, 695)}`, w: 8 }] },
        { id: 'leaf-a', d: maple(250, 640, 90, 10) }, { id: 'leaf-b', d: maple(760, 630, 92, 25) }, { id: 'leaf-c', d: maple(500, 520, 70, 0) },
        { id: 'acorns', d: compound(ell(150, 760, 50, 34), ell(880, 760, 50, 34)) },
        { id: 'falling', d: compound(maple(330, 200, 60, 5), maple(660, 260, 56, 20), maple(520, 100, 50, 0)) }
      ]
    },
    {
      id: 'wagon', name: 'Harvest wagon', group: 'thanksgiving', sections: [
        sky(), { id: 'sun', d: circ(160, 130, 78) }, hill(560),
        { id: 'road', d: `M0 690Q300 640 500 690T1000 670V800H0Z` },
        { id: 'hay', d: rect(770, 470, 190, 150, 14), det: [{ d: line(800, 490, 800, 600), w: 6 }, { d: line(865, 480, 865, 610), w: 6 }, { d: line(925, 490, 925, 600), w: 6 }] },
        { id: 'corn', d: compound(ell(330, 400, 36, 90, 20), ell(430, 380, 36, 90, -15), ell(570, 385, 36, 90, 10)) },
        { id: 'pump-a', d: ell(330, 470, 82, 66) }, { id: 'pump-b', d: ell(500, 450, 96, 78) }, { id: 'pump-c', d: ell(675, 470, 82, 66) },
        { id: 'bed', d: rect(230, 500, 540, 130, 20), det: [{ d: line(230, 565, 770, 565), w: 7 }, { d: line(370, 500, 370, 630), w: 7 }, { d: line(500, 500, 500, 630), w: 7 }, { d: line(630, 500, 630, 630), w: 7 }] },
        { id: 'tongue', d: rect(760, 634, 200, 50, 18) },
        { id: 'wheels', d: compound(circ(340, 680, 98), circ(680, 680, 98)), det: [] },
        { id: 'hubs', d: compound(circ(340, 680, 30), circ(680, 680, 30)) },
        { id: 'leaves', d: compound(maple(240, 250, 58, 5), maple(560, 210, 54, 25), maple(860, 300, 50, 0)) }
      ]
    },
    {
      id: 'deer', name: 'Little deer', group: 'thanksgiving', sections: [
        sky(), { id: 'sun', d: circ(860, 130, 76) }, hill(640),
        { id: 'trunks', d: compound(rect(90, 250, 90, 450, 14), rect(840, 220, 100, 480, 14)) },
        { id: 'crowns', d: compound(ell(135, 200, 150, 120), ell(890, 170, 140, 110)) },
        { id: 'tail', d: rpoly([[300, 540], [250, 470], [340, 490]], 12) },
        { id: 'legs', d: compound(rect(330, 640, 56, 150, 22), rect(410, 650, 56, 140, 22), rect(560, 650, 56, 140, 22), rect(640, 640, 56, 150, 22)) },
        { id: 'body', d: ell(500, 570, 200, 120) },
        { id: 'spots', d: compound(circ(430, 540, 28), circ(520, 520, 28), circ(590, 560, 28), circ(470, 600, 26), circ(390, 590, 26)) },
        { id: 'neck', d: spline([[600, 520], [690, 470], [720, 350], [800, 360], [770, 500], [690, 610]]) },
        { id: 'ears', d: compound(leaf(700, 330, 640, 250, 34), leaf(790, 320, 850, 250, 34)) },
        { id: 'head', d: ell(770, 370, 100, 78), det: [...eye(800, 350, 12), nose(850, 385, 16)] },
        { id: 'leaves', d: compound(maple(300, 150, 60, 5), maple(620, 110, 56, 25), maple(500, 300, 50, 0)) }
      ]
    }
  ];
  for (const p of P2) SPG.pictures.push(K.explode(p));

  const plainCloud = (x, y, s, id) => ({ id, d: cloud(x, y, s).d });
  const gingerman = (cx, cy, s) => spline([[0, -150], [38, -140], [52, -105], [40, -70], [95, -75], [130, -60], [128, -25], [85, -10], [60, -5], [70, 60], [100, 120], [80, 150], [35, 140], [0, 95], [-35, 140], [-80, 150], [-100, 120], [-70, 60], [-60, -5], [-85, -10], [-128, -25], [-130, -60], [-95, -75], [-40, -70], [-52, -105], [-38, -140]].map(([a, b]) => [cx + a * s, cy + b * s]));
  const cane = (x, y, h, r = 48) => thick([[x, y + h], [x, y + r], ...arcPts(x + r, y + r, r, 180, 360, 12), [x + 2 * r, y + r + 46]], 24);

  const P3 = [
    {
      id: 'tree', name: 'Christmas tree', group: 'christmas', sections: [
        sky(), stars([[110, 90, 44], [330, 60, 40], [690, 80, 42], [900, 210, 40], [130, 300, 38]]), hill(660),
        { id: 'trunk', d: rect(455, 640, 90, 130, 10) },
        { id: 'tier-3', d: rpoly([[170, 700], [500, 340], [830, 700]], 36) },
        { id: 'tier-2', d: rpoly([[240, 540], [500, 220], [760, 540]], 36) },
        { id: 'tier-1', d: rpoly([[320, 400], [500, 110], [680, 400]], 32) },
        { id: 'star', d: star(500, 90, 70, 31) },
        { id: 'orn-a', d: compound(circ(430, 320, 36), circ(565, 450, 38), circ(370, 610, 38)) },
        { id: 'orn-b', d: compound(circ(585, 300, 34), circ(440, 480, 36), circ(650, 620, 38)) },
        { id: 'gift-a', d: rect(70, 690, 170, 110, 10), det: [{ d: line(155, 690, 155, 800), w: 14 }, { d: line(70, 745, 240, 745), w: 14 }] },
        { id: 'gift-b', d: rect(760, 700, 180, 100, 10), det: [{ d: line(850, 700, 850, 800), w: 14 }, { d: line(760, 750, 940, 750), w: 14 }] }
      ]
    },
    {
      id: 'snowman', name: 'Snowman', group: 'christmas', sections: [
        sky(), stars([[110, 90, 44], [360, 60, 40], [650, 110, 42], [900, 90, 40], [880, 270, 38]]), hill(660),
        fir(140, 220, 660, 125, 'tree'),
        { id: 'ball-l', d: ell(520, 665, 175, 150) },
        { id: 'ball-m', d: ell(520, 480, 132, 118), det: [{ d: circ(520, 440, 12), f: INK }, { d: circ(520, 485, 12), f: INK }, { d: circ(520, 530, 12), f: INK }] },
        { id: 'arms', d: compound(thick([[400, 470], [310, 420], [235, 345]], 26), thick([[640, 470], [730, 420], [805, 335]], 26)) },
        { id: 'ball-h', d: circ(520, 335, 95), det: [{ d: circ(488, 310, 11), f: INK }, { d: circ(552, 310, 11), f: INK }, ...[[478, 372], [498, 385], [520, 390], [542, 385], [562, 372]].map(([x, y]) => ({ d: circ(x, y, 6), f: INK }))] },
        { id: 'brim', d: ell(520, 250, 128, 28) },
        { id: 'hat', d: rpoly([[440, 250], [452, 110], [588, 110], [600, 250]], 14) },
        { id: 'band', d: rect(447, 196, 146, 50, 6) },
        { id: 'scarf', d: spline([[420, 405], [520, 435], [620, 405], [640, 450], [585, 480], [610, 575], [545, 575], [520, 490], [400, 450]]) },
        { id: 'nose', d: rpoly([[525, 322], [668, 350], [525, 384]], 10) }
      ]
    },
    {
      id: 'santa', name: 'Santa', group: 'christmas', sections: [
        sky(), stars([[100, 90, 44], [330, 60, 40], [690, 70, 42], [910, 200, 40]]), { id: 'roof', d: `M0 660L1000 580V800H0Z` },
        { id: 'sack', d: spline([[90, 590], [170, 520], [260, 560], [270, 680], [200, 760], [100, 730]]), det: [{ d: curve([[150, 545], [190, 575], [230, 545]]), w: 8 }] },
        { id: 'coat', d: ell(500, 660, 235, 210) },
        { id: 'face', d: circ(500, 400, 130), det: [...eye(455, 385, 15), ...eye(545, 385, 15), { d: curve([[420, 350], [455, 335], [485, 348]]), w: 8 }, { d: curve([[515, 348], [545, 335], [580, 350]]), w: 8 }] },
        { id: 'beard', d: spline([[375, 440], [500, 520], [625, 440], [670, 540], [590, 660], [500, 700], [410, 660], [330, 540]]) },
        { id: 'mustache', d: compound(ell(442, 470, 58, 34, -14), ell(558, 470, 58, 34, 14)) },
        { id: 'nose', d: circ(500, 425, 33) },
        { id: 'hat', d: rpoly([[365, 330], [355, 160], [520, 60], [700, 250], [640, 330]], 34) },
        { id: 'trim', d: ell(500, 318, 178, 40) },
        { id: 'pom', d: circ(705, 245, 52) },
        { id: 'chimney', d: rect(300, 640, 400, 160, 8), det: [{ d: line(300, 700, 700, 700), w: 6 }, { d: line(400, 640, 400, 700), w: 6 }, { d: line(500, 700, 500, 800), w: 6 }, { d: line(600, 640, 600, 700), w: 6 }] }
      ]
    },
    {
      id: 'reindeer', name: 'Reindeer', group: 'christmas', sections: [
        sky(), stars([[110, 100, 44], [350, 60, 40], [650, 70, 42], [900, 130, 40]]), { id: 'trees', d: compound(rpoly([[40, 700], [110, 240], [180, 700]], 30), rpoly([[820, 700], [890, 220], [960, 700]], 30)) }, hill(680),
        { id: 'body', d: ell(500, 720, 210, 120) },
        { id: 'scarf', d: spline([[350, 570], [500, 610], [650, 570], [690, 630], [500, 675], [310, 630]]) },
        { id: 'antlers', d: compound(spline([[440, 260], [395, 215], [330, 195], [305, 120], [345, 108], [360, 160], [405, 140], [395, 75], [440, 68], [452, 150], [485, 235]]), spline([[560, 260], [605, 215], [670, 195], [695, 120], [655, 108], [640, 160], [595, 140], [605, 75], [560, 68], [548, 150], [515, 235]])) },
        { id: 'ears', d: compound(leaf(385, 330, 290, 285, 46), leaf(615, 330, 710, 285, 46)) },
        { id: 'head', d: ell(500, 410, 152, 142), det: [...eye(445, 385, 14), ...eye(555, 385, 14)] },
        { id: 'muzzle', d: ell(500, 480, 92, 68) },
        { id: 'nose', d: circ(500, 462, 42), det: [{ d: `M${P(478, 515)}Q${P(500, 535)} ${P(522, 515)}`, w: 8 }] }
      ]
    },
    {
      id: 'gingerhouse', name: 'Gingerbread house', group: 'christmas', sections: [
        sky(), stars([[110, 90, 44], [340, 60, 40], [640, 90, 42], [880, 210, 40]]), hill(650),
        { id: 'cane', d: compound(cane(90, 430, 300), cane(880, 430, 300)) },
        { id: 'house', d: rect(270, 430, 400, 300, 8) },
        { id: 'roof', d: rpoly([[220, 440], [470, 230], [720, 440]], 20), det: [{ d: curve([[290, 405], [340, 385], [390, 405], [440, 385], [490, 405], [540, 385], [590, 405], [640, 385]]), w: 8 }] },
        { id: 'door', d: `M400 730V600A70 70 0 0 1 540 600V730Z` },
        { id: 'windows', d: compound(rect(300, 490, 70, 80, 8), rect(570, 490, 70, 80, 8)), det: [{ d: line(335, 490, 335, 570), w: 6 }, { d: line(300, 530, 370, 530), w: 6 }, { d: line(605, 490, 605, 570), w: 6 }, { d: line(570, 530, 640, 530), w: 6 }] },
        { id: 'gumdrops', d: compound(circ(400, 340, 30), circ(470, 300, 30), circ(540, 340, 30), circ(470, 375, 26)) },
        { id: 'ginger', d: gingerman(800, 640, .75), det: [{ d: circ(800, 545, 5), f: INK }, ...eye(775, 548, 6), ...eye(825, 548, 6), { d: curve([[780, 575], [800, 590], [820, 575]]), w: 6 }, { d: circ(800, 620, 9), f: INK }, { d: circ(800, 655, 9), f: INK }] },
        { id: 'lolly-stick', d: rect(169, 640, 46, 160, 16) },
        { id: 'lolly', d: circ(192, 590, 62), det: [{ d: curve([[192, 590], [215, 590], [215, 568], [185, 560], [160, 592], [186, 622], [236, 606]]), w: 8 }] }
      ]
    },
    {
      id: 'gifts', name: 'Presents', group: 'christmas', sections: [
        { id: 'wall', d: rect(0, 0, 1000, 560) }, { id: 'floor', d: rect(0, 540, 1000, 260) }, { id: 'rug', d: ell(500, 650, 470, 130) },
        { id: 'window', d: rect(700, 60, 240, 260, 16), det: [{ d: line(820, 60, 820, 320), w: 8 }, { d: line(700, 190, 940, 190), w: 8 }] },
        { id: 'box-a', d: rect(120, 430, 260, 240, 12) }, { id: 'ribbon-a', d: cross(250, 550, 130, 120, 22) }, { id: 'bow-a', d: bowPath(250, 425, .64) },
        { id: 'box-b', d: rect(420, 500, 220, 190, 12) }, { id: 'ribbon-b', d: cross(530, 595, 110, 95, 20) }, { id: 'bow-b', d: bowPath(530, 500, .62) },
        { id: 'box-c', d: rect(690, 400, 200, 290, 12) }, { id: 'ribbon-c', d: cross(790, 545, 100, 145, 20) }, { id: 'bow-c', d: bowPath(790, 398, .62) },
        { id: 'baubles', d: compound(circ(80, 740, 42), circ(930, 730, 44)) }
      ]
    },
    {
      id: 'fireplace', name: 'Fireplace', group: 'christmas', sections: [
        { id: 'wall', d: rect(0, 0, 1000, 720) }, { id: 'floor', d: rect(0, 700, 1000, 100) },
        { id: 'surround', d: rect(210, 240, 580, 470) },
        { id: 'hearth', d: `M300 710V440Q300 385 355 385H645Q700 385 700 440V710Z` },
        { id: 'logs', d: compound(ell(380, 685, 104, 24, 8), ell(620, 685, 104, 24, -8)) },
        { id: 'flames', d: compound(rpoly([[335, 680], [390, 530], [445, 680]], 24), rpoly([[455, 680], [500, 490], [545, 680]], 24), rpoly([[555, 680], [610, 550], [665, 680]], 24)) },
        { id: 'candles', d: compound(rect(190, 90, 52, 80, 8), rect(758, 90, 52, 80, 8)), det: [{ d: drop(216, 66, 14), f: INK }, { d: drop(784, 66, 14), f: INK }] },
        { id: 'mantel', d: rect(150, 168, 700, 72, 14) },
        ...[[260, 'a'], [440, 'b'], [620, 'c']].map(([x, k]) => ({ id: 'stock-' + k, d: spline([[x, 262], [x + 96, 262], [x + 96, 400], [x + 150, 440], [x + 135, 490], [x + 30, 490], [x - 5, 420], [x, 300]]) })),
        { id: 'cuffs', d: compound(rect(254, 240, 108, 50, 12), rect(434, 240, 108, 50, 12), rect(614, 240, 108, 50, 12)) }
      ]
    },
    {
      id: 'penguin', name: 'Penguin', group: 'christmas', sections: [
        sky(), stars([[110, 90, 44], [330, 60, 40], [690, 70, 42], [900, 300, 40], [110, 330, 38]]),
        { id: 'aurora', d: spline([[0, 200], [200, 130], [420, 180], [640, 100], [1000, 190], [1000, 320], [640, 240], [420, 310], [200, 250], [0, 330]]) },
        hill(590, 'ice'), hill(670),
        { id: 'feet', d: compound(ell(410, 765, 72, 30), ell(590, 765, 72, 30)) },
        { id: 'flippers', d: compound(ell(320, 540, 52, 130, 15), ell(680, 540, 52, 130, -15)) },
        { id: 'body', d: ell(500, 500, 175, 250) },
        { id: 'belly', d: ell(500, 560, 112, 180) },
        { id: 'face', d: ell(500, 350, 105, 90), det: [...eye(465, 335, 13), ...eye(535, 335, 13)] },
        { id: 'beak', d: rpoly([[460, 372], [540, 372], [500, 440]], 14) },
        { id: 'scarf', d: spline([[350, 440], [500, 480], [650, 440], [665, 500], [590, 520], [610, 620], [545, 620], [525, 530], [340, 500]]) },
        { id: 'beanie', d: `M395 275A105 90 0 0 1 605 275Z` },
        { id: 'pom', d: circ(500, 160, 36) }
      ]
    },
    {
      id: 'wreath', name: 'Wreath', group: 'christmas', sections: [
        { id: 'door', d: rect(120, 0, 760, 800) },
        { id: 'panels', d: compound(rect(180, 50, 300, 300, 16), rect(520, 50, 300, 300, 16), rect(180, 420, 300, 340, 16), rect(520, 420, 300, 340, 16)) },
        { id: 'ring', d: ring(500, 380, 240, 118) },
        { id: 'holly', d: compound(leaf(300, 240, 380, 175, 40), leaf(620, 175, 700, 240, 40), leaf(690, 500, 760, 570, 40), leaf(310, 520, 240, 460, 40)) },
        { id: 'berries', d: compound(circ(345, 300, 30), circ(410, 250, 30), circ(655, 300, 30), circ(600, 520, 30), circ(350, 470, 30)) },
        { id: 'tails', d: rpoly([[490, 640], [420, 790], [475, 765], [500, 800], [525, 765], [580, 790], [510, 640]], 10) },
        { id: 'loops', d: compound(spline([[485, 645], [420, 590], [345, 605], [350, 690], [430, 705]]), spline([[515, 645], [580, 590], [655, 605], [650, 690], [570, 705]])) },
        { id: 'knot', d: circ(500, 650, 44) },
        { id: 'bells', d: compound(`M255 740Q255 665 310 650Q365 665 365 740Z`, `M635 740Q635 665 690 650Q745 665 745 740Z`) }
      ]
    },
    {
      id: 'sleigh', name: 'Sleigh ride', group: 'christmas', sections: [
        sky(), stars([[110, 90, 44], [340, 60, 40], [620, 130, 40], [900, 260, 40], [130, 300, 38]]), ...moonFull(820, 130, 88),
        plainCloud(250, 200, 1.3, 'cloud-a'), plainCloud(760, 330, 1.1, 'cloud-b'),
        hill(700),
        { id: 'houses', d: compound(rect(60, 620, 140, 100, 8), rect(800, 640, 150, 90, 8)) },
        { id: 'roofs', d: compound(rpoly([[45, 630], [130, 550], [215, 630]], 12), rpoly([[785, 650], [875, 570], [965, 650]], 12)) },
        { id: 'runner', d: thick([[270, 700], [430, 712], [640, 704], [760, 680], [800, 630], [780, 585]], 24) },
        { id: 'sleigh', d: spline([[300, 520], [470, 500], [730, 490], [785, 410], [835, 400], [825, 475], [765, 610], [680, 665], [340, 665], [290, 610]]) },
        { id: 'sack', d: spline([[330, 480], [400, 400], [490, 420], [525, 500], [445, 545], [350, 545]]) },
        { id: 'gifts', d: compound(rect(560, 425, 90, 82, 8), rect(660, 445, 70, 62, 8)) }
      ]
    }
  ];
  for (const p of P3) SPG.pictures.push(K.explode(p));
  // shared with the holiday collections below
  Object.assign(K, { stars, moonFull, moonCres, hill, thick, arcPts, fir, bowPath, cross, eyeWhite, wrapped, maple, plainCloud });
})();

// Coloring Book: holiday collections (Valentine's Day, Easter and spring, Summer fun, Birthday party, Hanukkah and winter
// lights, Lunar New Year). Same format and rules as games/color-pictures.js: plain data, sections back to front, every
// separate shape its own colorable section (`explode`), all inside 1000 x 800. Run `node tools/check-pictures.mjs`.
(() => {
  const SPG = window.SPG;
  const K = SPG.pictureKit;
  const { r1, P, ell, circ, rect, poly, rpoly, spline, curve, line, polar, flower, leaf, strip, dome, drop, star, compound, ring, crescent, face, eye, nose, sky, ground, sun, cloud, INK,
    stars, moonFull, moonCres, hill, thick, arcPts, bowPath, cross, eyeWhite, wrapped, plainCloud } = K;
  const D2R = Math.PI / 180;
  // A heart: s is about half its width; the tip is at (cx, cy + .9 s).
  const heart = (cx, cy, s) => `M${P(cx, cy + .9 * s)}C${P(cx - 1.25 * s, cy + .05 * s)} ${P(cx - 1.05 * s, cy - 1.05 * s)} ${P(cx, cy - .45 * s)}C${P(cx + 1.05 * s, cy - 1.05 * s)} ${P(cx + 1.25 * s, cy + .05 * s)} ${P(cx, cy + .9 * s)}Z`;
  // A real egg shape (narrower at the top). hw(y) is its half width at height y, used to fit bands inside it.
  const eggHW = (rx, ry, dy) => { const c = Math.max(-1, Math.min(1, -dy / ry)); return rx * Math.sqrt(Math.max(0, 1 - c * c)) * (1 - .14 * c); };
  const egg = (cx, cy, rx, ry, rot = 0) => {
    const a = rot * D2R, co = Math.cos(a), si = Math.sin(a);
    return poly(Array.from({ length: 72 }, (_, i) => { const t = i / 72 * Math.PI * 2, c = Math.cos(t), x = rx * Math.sin(t) * (1 - .14 * c), y = -ry * c; return [cx + x * co - y * si, cy + x * si + y * co]; }));
  };
  // A band across an (upright) egg between heights y1 and y2, with a zigzag (zig > 0) or wavy edge.
  const eggBand = (cx, cy, rx, ry, y1, y2, zig = 14, n = 6) => {
    const edge = (y0, dir) => Array.from({ length: n * 2 + 1 }, (_, i) => {
      const y = y0 + (i % 2 ? zig : -zig) * dir * (i === 0 || i === n * 2 ? 0 : 1), hw = eggHW(rx, ry, y - cy) - 1, x = -hw + (2 * hw) * i / (n * 2);
      return [cx + Math.max(-eggHW(rx, ry, y - cy) + 2, Math.min(eggHW(rx, ry, y - cy) - 2, x)), y];
    });
    const side = (ya, yb, sgn) => Array.from({ length: 9 }, (_, i) => { const y = ya + (yb - ya) * (i + 1) / 10; return [cx + sgn * eggHW(rx, ry, y - cy), y]; });
    const top = edge(y1, 1), bot = edge(y2, -1).reverse();
    return poly([...top, ...side(y1, y2, 1), ...bot, ...side(y2, y1, -1)]);
  };
  // A rectangle with only its top corners rounded.
  const rectTop = (x, y, w, h, r) => `M${P(x, y + h)}V${r1(y + r)}A${r} ${r} 0 0 1 ${P(x + r, y)}H${r1(x + w - r)}A${r} ${r} 0 0 1 ${P(x + w, y + r)}V${r1(y + h)}Z`;
  // A rectangle whose bottom edge is a row of n round scallops hanging d below y + h.
  const scallop = (x, y, w, h, n, d) => { let s = `M${P(x, y)}H${r1(x + w)}V${r1(y + h)}`; const k = w / n; for (let i = n - 1; i >= 0; i--) s += `Q${P(x + k * (i + .5), y + h + d * 2)} ${P(x + k * i, y + h)}`; return s + 'Z'; };
  // Rotate a list of points around (cx, cy).
  const turn = (pts, cx, cy, deg) => { const a = deg * D2R, c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };
  const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  // One piece of an elliptical ring (a swim ring, a beach ball band), from angle a0 to a1 in degrees.
  const ringSeg = (cx, cy, RX, RY, rx, ry, a0, a1, n = 16) => {
    const pt = (a, X, Y) => [cx + Math.cos(a * D2R) * X, cy + Math.sin(a * D2R) * Y];
    return poly([...Array.from({ length: n + 1 }, (_, i) => pt(a0 + (a1 - a0) * i / n, RX, RY)), ...Array.from({ length: n + 1 }, (_, i) => pt(a1 - (a1 - a0) * i / n, rx, ry))]);
  };
  // The slice of a triangle (apex at top) between heights y1 and y2: for stripes on party hats.
  const triBand = (apex, bl, br, y1, y2) => {
    const at = (p, q, y) => p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1]);
    return poly([[at(apex, bl, y1), y1], [at(apex, br, y1), y1], [at(apex, br, y2), y2], [at(apex, bl, y2), y2]]);
  };
  const hexagram = (cx, cy, R) => star(cx, cy, R, R / Math.sqrt(3), 6, -90);
  const smile = (x, y, w, bend = 24, wd = 8) => ({ d: `M${P(x - w, y)}Q${P(x, y + bend)} ${P(x + w, y)}`, w: wd });
  const blush = (x, y, r = 20) => ({ d: ell(x, y, r, r * .62), f: 'rgba(255,110,140,.35)' });
  const flowers5 = (list) => compound(...list.map(([x, y, r]) => flower(x, y, r, .38, 5)));
  const centers = (list) => compound(...list.map(([x, y, r]) => circ(x, y, Math.max(26, r * .4))));
  const add = (list) => { for (const p of list) SPG.pictures.push(K.explode(p)); };
  // The lower (or upper) part of an upright egg, cut off at height y1 by a zigzag crack: for hatching shells.
  const eggPart = (cx, cy, rx, ry, y1, lower, zig = 16, n = 7) => {
    const t1 = Math.acos(Math.max(-1, Math.min(1, (cy - y1) / ry)));
    const pt = t => { const c = Math.cos(t); return [cx + rx * Math.sin(t) * (1 - .14 * c), cy - ry * c]; };
    const arc = Array.from({ length: 41 }, (_, i) => lower ? pt(t1 + (2 * Math.PI - 2 * t1) * i / 40) : pt(-t1 + 2 * t1 * i / 40));
    const a = arc[arc.length - 1], b = arc[0];
    const zz = Array.from({ length: n * 2 - 1 }, (_, i) => { const k = (i + 1) / (n * 2); return [a[0] + (b[0] - a[0]) * k, y1 + (i % 2 ? zig : -zig) * (lower ? 1 : -1)]; });
    return [...arc, ...zz];
  };
  // A scalloped, fluffy ellipse (fleece, manes, clouds of fur).
  const fluffy = (cx, cy, rx, ry, n = 14, amp = .07) => polar(cx, cy, t => rx * ry / Math.hypot(ry * Math.cos(t), rx * Math.sin(t)) * (1 - amp + amp * Math.abs(Math.cos(n * t / 2))), 200);
  const tulip = (cx, cy, s = 1) => { const p = (x, y) => P(cx + x * s, cy + y * s); return `M${p(-70, -40)}L${p(-35, -8)}L${p(0, -62)}L${p(35, -8)}L${p(70, -40)}Q${p(78, 70)} ${p(0, 82)}Q${p(-78, 70)} ${p(-70, -40)}Z`; };
  // A tower or wall with battlements on top (n merlons).
  const battlement = (x, y, w, h, n = 3, mh = 34) => { const u = w / (2 * n - 1), pts = [[x, y + h], [x, y]]; for (let i = 0; i < 2 * n - 1; i++) { const up = i % 2 === 0; pts.push([x + u * (i + 1), up ? y : y + mh]); if (i < 2 * n - 2) pts.push([x + u * (i + 1), up ? y + mh : y]); } pts.push([x + w, y + h]); return poly(pts); };
  // Like scallop(), but with the top corners rounded to match a rounded box (cake tiers, piñata stripes).
  const scallopR = (x, y, w, h, n, d, r) => { let s = `M${P(x, y + h)}V${r1(y + r)}A${r} ${r} 0 0 1 ${P(x + r, y)}H${r1(x + w - r)}A${r} ${r} 0 0 1 ${P(x + w, y + r)}V${r1(y + h)}`; const k = w / n; for (let i = n - 1; i >= 0; i--) s += `Q${P(x + k * (i + .5), y + h + d * 2)} ${P(x + k * i, y + h)}`; return s + 'Z'; };
  const rectBot = (x, y, w, h, r) => `M${P(x, y)}H${r1(x + w)}V${r1(y + h - r)}A${r} ${r} 0 0 1 ${P(x + w - r, y + h)}H${r1(x + r)}A${r} ${r} 0 0 1 ${P(x, y + h - r)}Z`;
  const pennants = (x1, x2, y, n, sag = 40) => compound(...Array.from({ length: n }, (_, i) => { const t = (i + .5) / n, x = x1 + (x2 - x1) * t, yy = y + Math.sin(t * Math.PI) * sag; return rpoly([[x - 40, yy], [x + 40, yy], [x, yy + 88]], 8); }));
  const sagLine = (x1, x2, y, sag = 40) => ({ d: `M${P(x1 - 60, y - 6)}Q${P((x1 + x2) / 2, y + sag * 2)} ${P(x2 + 60, y - 6)}`, w: 6 });
  const weave = (x1, x2, ys) => ys.map(y => ({ d: line(x1, y, x2, y), w: 6 }));

  /* ================================================================ Valentine's Day */
  const bird = (x, y, s, dir, pre) => [
    { id: pre + 'tail', d: rpoly([[x - dir * 70 * s, y + 10 * s], [x - dir * 165 * s, y - 40 * s], [x - dir * 150 * s, y + 50 * s]], 14) },
    { id: pre + 'body', d: ell(x, y, 112 * s, 92 * s), det: [...eye(x + dir * 40 * s, y - 28 * s, 13 * s), blush(x + dir * 62 * s, y + 4 * s, 16)] },
    { id: pre + 'wing', d: ell(x - dir * 22 * s, y + 18 * s, 62 * s, 40 * s, dir * -18) },
    { id: pre + 'beak', d: rpoly([[x + dir * 96 * s, y - 44 * s], [x + dir * 160 * s, y - 12 * s], [x + dir * 96 * s, y + 20 * s]], 8) }
  ];
  const V = [
    {
      id: 'lovebear', name: 'Love bear', group: 'valentine', sections: [
        sky(), { id: 'hearts', d: compound(heart(140, 150, 52), heart(860, 130, 48), heart(880, 330, 40), heart(110, 360, 40)) }, ground(650),
        { id: 'ears', d: compound(circ(345, 220, 60), circ(655, 220, 60)) },
        { id: 'ear-in', d: compound(circ(345, 222, 30), circ(655, 222, 30)) },
        { id: 'body', d: ell(500, 630, 170, 150) },
        { id: 'feet', d: compound(ell(405, 765, 72, 36), ell(595, 765, 72, 36)) },
        { id: 'head', d: ell(500, 375, 180, 158), det: [...face(500, 350, 165, { smile: false }), blush(385, 410, 26), blush(615, 410, 26)] },
        { id: 'muzzle', d: ell(500, 440, 78, 58), det: [nose(500, 420, 24), { d: line(500, 440, 500, 458), w: 8 }, { d: `M${P(470, 458)}Q${P(500, 482)} ${P(530, 458)}`, w: 8 }] },
        { id: 'heart', d: heart(500, 600, 118) },
        { id: 'arms', d: compound(ell(370, 590, 48, 80, 35), ell(630, 590, 48, 80, -35)) }
      ]
    },
    {
      id: 'lovecard', name: 'Love letter', group: 'valentine', sections: [
        { id: 'wall', d: rect(0, 0, 1000, 800) },
        { id: 'hearts', d: compound(heart(120, 130, 50), heart(880, 120, 46), heart(110, 690, 46), heart(890, 690, 50), heart(500, 90, 40)) },
        { id: 'env-back', d: rect(220, 330, 560, 340, 26) },
        { id: 'letter', d: rect(290, 170, 420, 360, 20), det: [{ d: curve([[330, 400], [370, 385], [410, 405], [450, 388], [490, 404]]), w: 7 }, { d: curve([[510, 400], [550, 386], [590, 404], [630, 390], [670, 402]]), w: 7 }, { d: curve([[330, 450], [380, 436], [430, 455], [480, 438], [530, 452]]), w: 7 }] },
        { id: 'letter-heart', d: heart(500, 270, 64) },
        { id: 'pocket', d: rpoly([[220, 410], [500, 575], [780, 410], [780, 670], [220, 670]], 24) },
        { id: 'flap', d: rpoly([[232, 662], [500, 505], [768, 662]], 22) },
        { id: 'seal', d: heart(500, 580, 56) }
      ]
    },
    {
      id: 'lovecupcake', name: 'Heart cupcake', group: 'valentine', sections: [
        { id: 'wall', d: rect(0, 0, 1000, 600) }, { id: 'table', d: rect(0, 580, 1000, 220) },
        { id: 'window', d: rect(70, 80, 220, 220, 18), det: [{ d: line(180, 80, 180, 300), w: 8 }, { d: line(70, 190, 290, 190), w: 8 }] },
        { id: 'hearts', d: compound(heart(860, 160, 54), heart(760, 300, 40), heart(900, 360, 40)) },
        { id: 'plate', d: ell(500, 720, 280, 54) },
        { id: 'wrapper', d: rpoly([[330, 480], [670, 480], [625, 715], [375, 715]], 18), det: [{ d: line(400, 495, 418, 705), w: 7 }, { d: line(465, 495, 472, 708), w: 7 }, { d: line(535, 495, 528, 708), w: 7 }, { d: line(600, 495, 582, 705), w: 7 }] },
        { id: 'frost-1', d: ell(500, 465, 205, 70) },
        { id: 'frost-2', d: ell(500, 390, 155, 62), det: [{ d: line(440, 380, 455, 395), w: 8 }, { d: line(560, 375, 548, 392), w: 8 }, { d: line(500, 420, 515, 410), w: 8 }] },
        { id: 'frost-3', d: ell(500, 322, 102, 52), det: [{ d: line(470, 330, 482, 315), w: 8 }, { d: line(530, 335, 520, 320), w: 8 }] },
        { id: 'heart', d: heart(500, 225, 78) },
        { id: 'mini', d: rpoly([[760, 640], [880, 640], [865, 710], [775, 710]], 12) },
        { id: 'mini-top', d: ell(820, 625, 72, 40) }
      ]
    },
    {
      id: 'heartballoons', name: 'Heart balloons', group: 'valentine', sections: [
        { id: 'sky', d: rect(0, 0, 1000, 800), det: [{ d: curve([[330, 312], [420, 360], [636, 424]]), w: 6 }, { d: curve([[520, 254], [560, 330], [640, 420]]), w: 6 }, { d: curve([[700, 326], [680, 380], [644, 420]]), w: 6 }] },
        cloud(170, 470, .9), ground(650),
        { id: 'balloon-a', d: heart(330, 230, 92) }, { id: 'balloon-b', d: heart(520, 170, 96) }, { id: 'balloon-c', d: heart(705, 250, 88) },
        { id: 'flowers', d: flowers5([[120, 720, 56], [880, 720, 56]]) }, { id: 'centers', d: centers([[120, 720, 56], [880, 720, 56]]) },
        { id: 'tail', d: spline([[600, 700], [690, 680], [750, 610], [740, 540], [780, 530], [800, 600], [770, 690], [690, 745], [600, 750]]) },
        { id: 'body', d: ell(500, 650, 125, 112) },
        { id: 'ears', d: compound(rpoly([[385, 440], [390, 330], [470, 400]], 16), rpoly([[615, 440], [610, 330], [530, 400]], 16)) },
        { id: 'arm', d: thick([[585, 600], [620, 530], [642, 470]], 30) },
        { id: 'head', d: ell(500, 500, 132, 112), det: [...face(500, 500, 125), nose(500, 520, 11), { d: line(400, 520, 350, 510), w: 6 }, { d: line(400, 540, 352, 552), w: 6 }, { d: line(600, 520, 650, 510), w: 6 }, { d: line(600, 540, 648, 552), w: 6 }] },
        { id: 'paw', d: ell(645, 440, 40, 44) }
      ]
    },
    {
      id: 'lovebirds', name: 'Love birds', group: 'valentine', sections: [
        sky(), sun(870, 120, 62), cloud(170, 140, .85),
        { id: 'branch', d: thick([[0, 600], [250, 585], [520, 600], [780, 580], [1000, 560]], 28) },
        { id: 'leaves', d: compound(leaf(140, 590, 80, 500, 34), leaf(860, 572, 940, 485, 34), leaf(660, 590, 720, 680, 32)) },
        ...bird(330, 470, 1, 1, 'l-'), ...bird(670, 470, 1, -1, 'r-'),
        { id: 'heart', d: heart(500, 285, 82) },
        { id: 'hearts', d: compound(heart(380, 180, 44), heart(630, 170, 44)) }
      ]
    },
    {
      id: 'roses', name: 'Roses', group: 'valentine', sections: [
        { id: 'wall', d: rect(0, 0, 1000, 620), det: [{ d: line(500, 470, 380, 270), w: 12 }, { d: line(500, 470, 520, 210), w: 12 }, { d: line(500, 470, 640, 295), w: 12 }] },
        { id: 'table', d: rect(0, 600, 1000, 200) },
        { id: 'hearts', d: compound(heart(140, 160, 54), heart(860, 150, 54), heart(150, 420, 42), heart(860, 430, 42)) },
        { id: 'leaves', d: compound(leaf(440, 385, 320, 360, 48), leaf(560, 365, 700, 385, 48), leaf(505, 300, 600, 245, 44)) },
        { id: 'rose-a', d: circ(380, 265, 74), det: [{ d: curve([[380, 265], [400, 262], [400, 240], [372, 235], [350, 262], [372, 292], [412, 285], [430, 250]]), w: 8 }] },
        { id: 'rose-c', d: circ(640, 290, 72), det: [{ d: curve([[640, 290], [660, 287], [660, 265], [632, 260], [610, 287], [632, 317], [672, 310], [690, 275]]), w: 8 }] },
        { id: 'rose-b', d: circ(520, 200, 80), det: [{ d: curve([[520, 200], [542, 197], [542, 172], [512, 167], [488, 197], [512, 230], [556, 222], [576, 184]]), w: 8 }] },
        { id: 'vase', d: spline([[438, 468], [562, 468], [548, 522], [622, 585], [645, 665], [600, 735], [400, 735], [355, 665], [378, 585], [452, 522]]) },
        { id: 'vase-heart', d: heart(500, 615, 62) },
        { id: 'bow', d: bowPath(500, 488, .55) }
      ]
    }
  ];
  add(V);

  /* ================================================================ Easter and spring */
  const E = [
    {
      id: 'eggbasket', name: 'Egg basket', group: 'easter', sections: [
        sky(), sun(860, 120, 64), cloud(180, 140, .9), ground(600),
        { id: 'handle', d: thick(arcPts(500, 525, 215, 180, 360, 24), 22) },
        { id: 'egg-1', d: egg(375, 500, 60, 80, -14) }, { id: 'egg-2', d: egg(465, 468, 62, 84, -4) }, { id: 'egg-3', d: egg(555, 472, 62, 84, 6) }, { id: 'egg-4', d: egg(640, 502, 60, 80, 15) },
        { id: 'basket', d: rpoly([[265, 530], [735, 530], [690, 738], [310, 738]], 30), det: [...weave(285, 715, [600, 668]), { d: line(390, 545, 405, 735), w: 6 }, { d: line(500, 545, 500, 738), w: 6 }, { d: line(610, 545, 595, 735), w: 6 }] },
        { id: 'rim', d: rect(245, 505, 510, 56, 28) },
        { id: 'egg-l', d: egg(150, 672, 72, 94) }, { id: 'band-l', d: eggBand(150, 672, 72, 94, 650, 698, 13, 4) },
        { id: 'egg-r', d: egg(862, 680, 68, 90), det: [{ d: circ(842, 635, 9), f: INK }, { d: circ(885, 650, 9), f: INK }, { d: circ(845, 735, 9), f: INK }, { d: circ(890, 728, 9), f: INK }] }, { id: 'band-r', d: eggBand(862, 680, 68, 90, 662, 702, 10, 3) }
      ]
    },
    {
      id: 'basketbunny', name: 'Bunny and eggs', group: 'easter', sections: [
        sky(), cloud(820, 140, .9), ground(620),
        { id: 'flowers', d: flowers5([[110, 705, 54], [905, 700, 50]]) }, { id: 'centers', d: centers([[110, 705, 54], [905, 700, 50]]) },
        { id: 'ears', d: compound(ell(392, 178, 44, 118, -10), ell(528, 178, 44, 118, 10)) },
        { id: 'ear-in', d: compound(ell(394, 190, 24, 86, -10), ell(526, 190, 24, 86, 10)) },
        { id: 'body', d: ell(460, 600, 150, 150) },
        { id: 'belly', d: ell(450, 625, 88, 100) },
        { id: 'feet', d: compound(ell(380, 752, 70, 34), ell(540, 752, 70, 34)) },
        { id: 'head', d: ell(460, 370, 150, 130), det: [...face(460, 370, 140), nose(460, 400, 17), blush(375, 410, 22), blush(545, 410, 22)] },
        { id: 'egg-a', d: egg(668, 650, 44, 58, -10) }, { id: 'egg-b', d: egg(752, 648, 44, 58, 10) },
        { id: 'basket', d: rpoly([[600, 655], [820, 655], [790, 755], [630, 755]], 22), det: weave(612, 806, [690, 725]) },
        { id: 'egg', d: egg(455, 595, 62, 80, 0) }, { id: 'band', d: eggBand(455, 595, 62, 80, 575, 618, 12, 3) },
        { id: 'paws', d: compound(ell(385, 615, 36, 32), ell(525, 615, 36, 32)) }
      ]
    },
    {
      id: 'hatching', name: 'Chick hatching', group: 'easter', sections: [
        sky(), sun(150, 120, 62), ground(660),
        { id: 'flowers', d: flowers5([[120, 715, 50], [885, 715, 54]]) }, { id: 'centers', d: centers([[120, 715, 50], [885, 715, 54]]) },
        { id: 'chick', d: circ(500, 385, 150), det: [...eye(448, 360, 15), ...eye(552, 360, 15), blush(415, 410, 22), blush(585, 410, 22)] },
        { id: 'wings', d: compound(ell(345, 440, 44, 72, -35), ell(655, 440, 44, 72, 35)) },
        { id: 'shell-bottom', d: poly(eggPart(500, 505, 190, 250, 475, true)) },
        { id: 'shell-top', d: poly(turn(eggPart(500, 300, 130, 170, 262, false, 13, 5), 500, 230, 14)) },
        { id: 'beak', d: rpoly([[460, 398], [540, 398], [500, 458]], 10) },
        { id: 'bits', d: compound(rpoly([[190, 725], [272, 712], [236, 655]], 8), rpoly([[740, 740], [820, 712], [784, 660]], 8)) }
      ]
    },
    {
      id: 'lamb', name: 'Little lamb', group: 'easter', sections: [
        sky(), cloud(200, 130, .9), plainCloud(760, 175, .75, 'cloud-b'), ground(600),
        { id: 'legs', d: compound(rect(388, 600, 54, 125, 24), rect(456, 615, 54, 110, 24), rect(582, 615, 54, 110, 24), rect(650, 600, 54, 125, 24)) },
        { id: 'hooves', d: compound(rect(386, 702, 58, 52, 20), rect(454, 702, 58, 52, 20), rect(580, 702, 58, 52, 20), rect(648, 702, 58, 52, 20)) },
        { id: 'tail', d: fluffy(765, 470, 48, 46, 8, .12) },
        { id: 'fleece', d: fluffy(550, 515, 220, 145, 16, .07) },
        { id: 'ears', d: compound(ell(248, 418, 60, 28, -25), ell(432, 408, 60, 28, 25)) },
        { id: 'head', d: ell(340, 440, 92, 86), det: [...eye(310, 440, 12), ...eye(370, 440, 12), nose(340, 475, 11), { d: `M${P(322, 492)}Q${P(340, 505)} ${P(358, 492)}`, w: 7 }, blush(290, 470, 16), blush(390, 470, 16)] },
        { id: 'tuft', d: fluffy(340, 365, 64, 46, 8, .14) },
        { id: 'flowers', d: flowers5([[120, 700, 52], [880, 720, 54]]) }, { id: 'centers', d: centers([[120, 700, 52], [880, 720, 54]]) },
        { id: 'wings', d: compound(ell(822, 330, 46, 34, -35), ell(898, 330, 46, 34, 35)), det: [{ d: ell(860, 335, 11, 34), f: INK }] }
      ]
    },
    {
      id: 'springtulips', name: 'Tulips', group: 'easter', sections: [
        sky(), sun(855, 120, 62), cloud(190, 140, .9), ground(650),
        { id: 'stems', d: compound(rect(275, 420, 50, 340, 22), rect(475, 360, 50, 400, 22), rect(675, 440, 50, 320, 22)) },
        { id: 'leaf-a1', d: leaf(295, 740, 170, 540, 46) }, { id: 'leaf-a2', d: leaf(325, 700, 420, 570, 38) },
        { id: 'leaf-b1', d: leaf(480, 740, 380, 590, 40) }, { id: 'leaf-b2', d: leaf(520, 720, 620, 540, 46) },
        { id: 'leaf-c1', d: leaf(705, 740, 830, 560, 46) }, { id: 'leaf-c2', d: leaf(675, 720, 600, 610, 34) },
        { id: 'tulip-a', d: tulip(300, 370, 1) }, { id: 'tulip-b', d: tulip(500, 305, 1.06) }, { id: 'tulip-c', d: tulip(700, 392, .96) },
        { id: 'bug', d: circ(222, 615, 38), det: [{ d: dome(222, 584, 22, 18, 200, 244).replace(/Z$/, 'Z'), f: INK }, { d: line(222, 590, 222, 652), w: 6 }, { d: circ(205, 612, 8), f: INK }, { d: circ(240, 618, 8), f: INK }, { d: circ(212, 640, 7), f: INK }, { d: circ(234, 642, 7), f: INK }] }
      ]
    },
    {
      id: 'nest', name: 'Bird nest', group: 'easter', sections: [
        sky(), cloud(160, 130, .85), sun(860, 110, 58),
        { id: 'branch', d: thick([[0, 565], [300, 545], [600, 565], [1000, 505]], 30) },
        { id: 'blossoms', d: flowers5([[110, 505, 46], [905, 605, 44], [650, 625, 46], [230, 625, 44]]) }, { id: 'centers', d: centers([[110, 505, 46], [905, 605, 44], [650, 625, 46], [230, 625, 44]]) },
        { id: 'eggs', d: compound(egg(370, 500, 48, 62, -12), egg(452, 485, 50, 64, 0), egg(534, 500, 48, 62, 12)) },
        { id: 'nest', d: `M250 515A200 130 0 0 0 650 515Z`, det: [{ d: curve([[280, 560], [380, 585], [480, 575], [600, 560]]), w: 7 }, { d: curve([[320, 605], [420, 625], [520, 615], [590, 595]]), w: 7 }] },
        ...bird(790, 440, .85, -1, '')
      ]
    }
  ];
  add(E);

  /* ================================================================ Summer fun */
  const S = [
    {
      id: 'fireworks', name: 'Fireworks', group: 'summer', sections: [
        sky(), stars([[90, 90, 32], [420, 70, 30], [900, 300, 32], [100, 420, 30], [880, 520, 28]], 'sparkles'),
        { id: 'burst-a', d: star(250, 230, 150, 76, 10, -90) }, { id: 'burst-a-in', d: circ(250, 230, 54) },
        { id: 'burst-b', d: star(700, 180, 130, 64, 12, -90) }, { id: 'burst-b-in', d: star(700, 180, 56, 30, 6, -90) },
        { id: 'burst-c', d: star(500, 410, 105, 54, 8, -90) }, { id: 'burst-c-in', d: circ(500, 410, 40) },
        hill(660),
        { id: 'blanket', d: rpoly([[250, 700], [760, 690], [800, 800], [210, 810]], 20) },
        { id: 'bear-body', d: ell(395, 705, 102, 86) },
        { id: 'bear-ears', d: compound(circ(342, 548, 30), circ(448, 548, 30)) },
        { id: 'bear-head', d: circ(395, 605, 74) },
        { id: 'bunny-body', d: ell(615, 712, 88, 78) },
        { id: 'bunny-ears', d: compound(ell(588, 525, 26, 64, -10), ell(644, 525, 26, 64, 10)) },
        { id: 'bunny-head', d: circ(615, 620, 64) },
        { id: 'bunny-tail', d: circ(615, 748, 26) }
      ]
    },
    {
      id: 'beachday', name: 'Beach day', group: 'summer', sections: [
        sky(), sun(130, 120, 62), cloud(780, 130, .85),
        { id: 'sea', d: `M0 380Q125 355 250 380T500 380T750 380T1000 380V560H0Z` },
        { id: 'sail', d: rpoly([[780, 352], [780, 215], [880, 352]], 10) },
        { id: 'hull', d: rpoly([[690, 360], [900, 360], [865, 418], [722, 418]], 12) },
        { id: 'sand', d: `M0 520C250 480 650 560 1000 500V800H0Z`, det: [{ d: line(250, 430, 250, 690), w: 14 }] },
        { id: 'canopy-l', d: dome(250, 432, 200, 125, 50, 184) }, { id: 'canopy-m', d: dome(250, 432, 200, 125, 184, 316) }, { id: 'canopy-r', d: dome(250, 432, 200, 125, 316, 450) },
        { id: 'towel', d: rpoly([[80, 650], [420, 628], [452, 752], [52, 772]], 16), det: [{ d: line(150, 646, 132, 768), w: 7 }, { d: line(370, 632, 395, 756), w: 7 }] },
        { id: 'ball', d: circ(620, 640, 105) },
        { id: 'stripe-l', d: `M620 535A105 105 0 0 0 620 745Q540 640 620 535Z` }, { id: 'stripe-r', d: `M620 535A105 105 0 0 1 620 745Q700 640 620 535Z` },
        { id: 'bucket', d: rpoly([[780, 605], [900, 605], [884, 728], [796, 728]], 12), det: [{ d: `M${P(782, 600)}Q${P(840, 520)} ${P(898, 600)}`, w: 7 }] },
        { id: 'bucket-rim', d: rect(768, 582, 144, 54, 18) },
        { id: 'starfish', d: star(480, 742, 54, 26), det: [] },
        { id: 'shell', d: `M${P(905, 778)}L${P(866, 728)}Q${P(915, 650)} ${P(966, 728)}L${P(927, 778)}Z`, det: [{ d: line(916, 772, 900, 700), w: 6 }, { d: line(916, 772, 935, 700), w: 6 }] }
      ]
    },
    {
      id: 'icepops', name: 'Ice pops', group: 'summer', sections: [
        sky(), sun(865, 115, 60), cloud(165, 135, .85), ground(640, 'sand'),
        { id: 'pop-a', d: rectTop(300, 250, 140, 330, 62) }, { id: 'band-a', d: rectTop(300, 250, 140, 96, 62) }, { id: 'band-a2', d: rect(300, 346, 140, 92) },
        { id: 'pop-b', d: `M470 580V270A70 70 0 0 1 540 200H560A60 60 0 0 0 620 260V580Z` },
        { id: 'dip-b', d: `M470 335V270A70 70 0 0 1 540 200H560A60 60 0 0 0 620 260V335Q595 395 570 335Q545 370 520 335Q495 390 470 335Z` },
        { id: 'pop-c', d: rectTop(650, 270, 130, 310, 60) }, { id: 'band-c1', d: rect(650, 360, 130, 60) }, { id: 'band-c2', d: rect(650, 470, 130, 60) },
        { id: 'handles', d: compound(rect(200, 580, 70, 100, 26), rect(730, 580, 70, 100, 26)) },
        { id: 'cooler', d: rpoly([[250, 525], [750, 525], [728, 745], [272, 745]], 26), det: [{ d: circ(500, 640, 40), w: 7 }, ...[0, 60, 120].map(a => ({ d: line(500 + Math.cos(a * D2R) * 62, 640 + Math.sin(a * D2R) * 62, 500 - Math.cos(a * D2R) * 62, 640 - Math.sin(a * D2R) * 62), w: 7 }))] },
        { id: 'rim', d: rect(232, 492, 536, 60, 24) },
        { id: 'ice', d: compound(rpoly(turn(box(420, 462, 60, 60), 450, 492, 18), 12), rpoly(turn(box(612, 466, 58, 58), 641, 495, -14), 12)) }
      ]
    },
    {
      id: 'sandcastle', name: 'Sandcastle', group: 'summer', sections: [
        sky(), sun(860, 115, 60), cloud(165, 135, .85),
        { id: 'sea', d: `M0 360Q125 335 250 360T500 360T750 360T1000 360V520H0Z` },
        { id: 'sand', d: `M0 470C300 440 700 500 1000 450V800H0Z` },
        { id: 'keep', d: battlement(330, 380, 340, 320, 4, 36) },
        { id: 'tower-l', d: battlement(210, 260, 140, 440, 3, 34), det: [{ d: line(280, 260, 280, 170), w: 8 }] },
        { id: 'tower-r', d: battlement(650, 260, 140, 440, 3, 34), det: [{ d: line(720, 260, 720, 170), w: 8 }] },
        { id: 'flag-l', d: rpoly([[282, 170], [282, 240], [352, 205]], 8) }, { id: 'flag-r', d: rpoly([[722, 170], [722, 240], [792, 205]], 8) },
        { id: 'door', d: `M445 700V605A55 55 0 0 1 555 605V700Z` },
        { id: 'windows', d: compound(`M255 410V385A25 25 0 0 1 305 385V410Z`, `M695 410V385A25 25 0 0 1 745 385V410Z`, `M475 520V495A25 25 0 0 1 525 495V520Z`) },
        { id: 'claws', d: compound(circ(95, 650, 32), circ(265, 650, 32)) },
        { id: 'crab', d: ell(180, 715, 78, 50), det: [{ d: line(155, 668, 150, 630), w: 7 }, { d: line(205, 668, 210, 630), w: 7 }, { d: circ(150, 622, 13), f: INK }, { d: circ(210, 622, 13), f: INK }, smile(180, 722, 26, 16, 7), { d: line(110, 690, 104, 662), w: 7 }, { d: line(250, 690, 256, 662), w: 7 }] },
        { id: 'starfish', d: star(880, 700, 58, 27) },
        { id: 'shell', d: `M${P(760, 778)}L${P(720, 728)}Q${P(770, 650)} ${P(820, 728)}L${P(780, 778)}Z`, det: [{ d: line(770, 772, 754, 700), w: 6 }, { d: line(770, 772, 789, 700), w: 6 }] }
      ]
    },
    {
      id: 'picnic', name: 'Picnic', group: 'summer', sections: [
        sky(), sun(865, 110, 58), cloud(470, 120, .8), ground(430, 'grass'),
        { id: 'trunk', d: rect(70, 200, 90, 330, 18) },
        { id: 'crown', d: ell(115, 170, 160, 125) },
        { id: 'blanket', d: rpoly([[170, 560], [830, 560], [965, 792], [35, 792]], 16), det: [{ d: line(390, 560, 340, 792), w: 7 }, { d: line(610, 560, 660, 792), w: 7 }, { d: line(120, 650, 880, 650), w: 7 }, { d: line(75, 722, 925, 722), w: 7 }] },
        { id: 'handle', d: thick(arcPts(330, 560, 88, 180, 360, 14), 18) },
        { id: 'basket', d: rpoly([[230, 562], [430, 562], [410, 690], [250, 690]], 18), det: weave(238, 422, [605, 648]) },
        { id: 'lid', d: rect(212, 538, 236, 50, 22) },
        { id: 'rind', d: `M500 650A115 105 0 0 0 730 650Z` },
        { id: 'melon', d: `M522 650A93 82 0 0 0 708 650Z`, det: [{ d: drop(570, 680, 7), f: INK }, { d: drop(615, 700, 7), f: INK }, { d: drop(660, 680, 7), f: INK }] },
        { id: 'glass', d: rpoly([[788, 548], [880, 548], [868, 690], [800, 690]], 10) },
        { id: 'lemonade', d: rpoly([[797, 592], [872, 592], [863, 683], [806, 683]], 6) },
        { id: 'lemon', d: circ(880, 555, 32), det: [{ d: line(856, 555, 904, 555), w: 5 }, { d: line(880, 531, 880, 579), w: 5 }] },
        { id: 'sandwich', d: rpoly([[462, 612], [588, 520], [612, 612]], 14), det: [{ d: line(492, 590, 600, 590), w: 7 }] },
        { id: 'apple', d: circ(170, 722, 48), det: [{ d: curve([[170, 674], [174, 652], [188, 640]]), w: 8 }] }
      ]
    },
    {
      id: 'poolparty', name: 'Pool party', group: 'summer', sections: [
        sky(), sun(865, 110, 60),
        { id: 'trunk', d: thick([[110, 640], [126, 450], [168, 250]], 26) },
        { id: 'frond-1', d: leaf(168, 240, 30, 200, 46) }, { id: 'frond-2', d: leaf(168, 240, 320, 190, 46) }, { id: 'frond-3', d: leaf(168, 240, 80, 340, 34) }, { id: 'frond-4', d: leaf(168, 240, 280, 330, 34) },
        { id: 'tiles', d: rect(0, 470, 1000, 64), det: [{ d: line(200, 470, 200, 534), w: 6 }, { d: line(400, 470, 400, 534), w: 6 }, { d: line(600, 470, 600, 534), w: 6 }, { d: line(800, 470, 800, 534), w: 6 }] },
        { id: 'water', d: `M0 545Q125 525 250 545T500 545T750 545T1000 545V800H0Z`, det: [{ d: curve([[80, 720], [130, 705], [180, 720]]), w: 6 }, { d: curve([[760, 760], [810, 745], [860, 760]]), w: 6 }] },
        { id: 'ring-b1', d: ringSeg(520, 650, 195, 88, 110, 38, 180, 240) }, { id: 'ring-b2', d: ringSeg(520, 650, 195, 88, 110, 38, 240, 300) }, { id: 'ring-b3', d: ringSeg(520, 650, 195, 88, 110, 38, 300, 360) },
        { id: 'frog-body', d: ell(520, 620, 92, 70) },
        { id: 'eye-bumps', d: compound(circ(468, 470, 38), circ(572, 470, 38)), det: [...eyeWhite(468, 470, 24, 2), ...eyeWhite(572, 470, 24, -2)] },
        { id: 'frog-head', d: ell(520, 535, 110, 72), det: [smile(520, 545, 52, 30), blush(445, 555, 18), blush(595, 555, 18)] },
        { id: 'ring-f1', d: ringSeg(520, 650, 195, 88, 110, 38, 0, 60) }, { id: 'ring-f2', d: ringSeg(520, 650, 195, 88, 110, 38, 60, 120) }, { id: 'ring-f3', d: ringSeg(520, 650, 195, 88, 110, 38, 120, 180) },
        { id: 'arms', d: compound(ell(420, 625, 26, 48, 50), ell(620, 625, 26, 48, -50)) },
        { id: 'duck', d: ell(845, 668, 82, 54) },
        { id: 'duck-head', d: circ(880, 595, 44), det: [...eye(892, 585, 9)] },
        { id: 'beak', d: rpoly([[910, 568], [972, 598], [910, 630]], 10) },
        { id: 'wing', d: ell(830, 662, 42, 28, -12) }
      ]
    }
  ];
  add(S);

  /* ================================================================ Birthday party */
  const B = [
    {
      id: 'bdaycake', name: 'Birthday cake', group: 'birthday', sections: [
        { id: 'wall', d: rect(0, 0, 1000, 600), det: [sagLine(120, 880, 40), { d: curve([[130, 392], [120, 470], [150, 590]]), w: 6 }, { d: curve([[870, 392], [880, 470], [850, 590]]), w: 6 }] },
        { id: 'table', d: rect(0, 580, 1000, 220) },
        { id: 'bunting', d: pennants(120, 880, 40, 6) },
        { id: 'balloon-l', d: ell(130, 300, 70, 88) }, { id: 'balloon-r', d: ell(870, 300, 70, 88) },
        { id: 'stand-foot', d: rpoly([[430, 700], [570, 700], [600, 772], [400, 772]], 14) },
        { id: 'stand', d: ell(500, 690, 255, 34) },
        { id: 'tier-1', d: rect(290, 520, 420, 168, 20) }, { id: 'icing-1', d: scallopR(290, 520, 420, 44, 7, 14, 20) },
        { id: 'tier-2', d: rect(350, 400, 300, 128, 20) }, { id: 'icing-2', d: scallopR(350, 400, 300, 42, 5, 13, 20) },
        { id: 'tier-3', d: rect(410, 300, 180, 108, 18) }, { id: 'icing-3', d: scallopR(410, 300, 180, 40, 3, 12, 18) },
        { id: 'candles', d: compound(rect(420, 205, 50, 100, 10), rect(475, 205, 50, 100, 10), rect(530, 205, 50, 100, 10)), det: [{ d: line(425, 240, 465, 220), w: 6 }, { d: line(425, 280, 465, 260), w: 6 }, { d: line(480, 240, 520, 220), w: 6 }, { d: line(480, 280, 520, 260), w: 6 }, { d: line(535, 240, 575, 220), w: 6 }, { d: line(535, 280, 575, 260), w: 6 }] },
        { id: 'flames', d: compound(drop(445, 168, 26), drop(500, 168, 26), drop(555, 168, 26)) }
      ]
    },
    {
      id: 'partypup', name: 'Party puppy', group: 'birthday', sections: [
        { id: 'wall', d: rect(0, 0, 1000, 620), det: [{ d: curve([[140, 258], [130, 400], [160, 600]]), w: 6 }, { d: curve([[860, 278], [870, 420], [840, 600]]), w: 6 }] },
        { id: 'floor', d: rect(0, 600, 1000, 200) },
        { id: 'balloons', d: compound(ell(140, 180, 62, 78), ell(860, 200, 62, 78)) },
        { id: 'ears', d: compound(ell(335, 420, 54, 108, 18), ell(625, 420, 54, 108, -18)) },
        { id: 'body', d: ell(480, 645, 150, 130) },
        { id: 'paws', d: compound(ell(415, 762, 64, 34), ell(545, 762, 64, 34)) },
        { id: 'head', d: ell(480, 415, 150, 130), det: [...eye(430, 400, 16), blush(400, 455, 22), blush(560, 455, 22)] },
        { id: 'patch', d: ell(535, 395, 52, 48), det: [...eye(530, 400, 16)] },
        { id: 'muzzle', d: ell(480, 475, 74, 54), det: [nose(480, 455, 20), smile(480, 480, 30, 22, 7)] },
        { id: 'hat', d: rpoly([[390, 300], [480, 88], [570, 300]], 14) },
        { id: 'hat-band1', d: triBand([480, 88], [390, 300], [570, 300], 146, 198) }, { id: 'hat-band2', d: triBand([480, 88], [390, 300], [570, 300], 224, 276) },
        { id: 'pom', d: circ(480, 90, 34) },
        { id: 'horn', d: rpoly([[530, 492], [700, 452], [714, 516], [532, 512]], 12), det: [{ d: line(590, 480, 594, 508), w: 6 }, { d: line(650, 466, 655, 510), w: 6 }] },
        { id: 'wrapper', d: rpoly([[760, 622], [900, 622], [885, 722], [775, 722]], 10) },
        { id: 'frosting', d: ell(830, 610, 84, 46) },
        { id: 'cherry', d: circ(830, 555, 27) }
      ]
    },
    {
      id: 'balloonbunch', name: 'Balloons', group: 'birthday', sections: [
        { id: 'sky', d: rect(0, 0, 1000, 800), det: [[330, 325], [470, 268], [610, 315], [400, 450], [545, 442], [690, 462]].map(([x, y]) => ({ d: `M${P(x, y)}Q${P((x + 500) / 2 + (x < 500 ? 20 : -20), (y + 575) / 2)} ${P(500, 578)}`, w: 6 })) },
        sun(130, 110, 58), cloud(830, 120, .8), ground(650),
        { id: 'flowers', d: flowers5([[110, 720, 52], [890, 720, 52]]) }, { id: 'centers', d: centers([[110, 720, 52], [890, 720, 52]]) },
        { id: 'balloon-1', d: ell(330, 230, 78, 95) }, { id: 'balloon-2', d: ell(470, 172, 80, 98) }, { id: 'balloon-3', d: ell(610, 220, 78, 95) },
        { id: 'balloon-4', d: ell(400, 358, 74, 90) }, { id: 'balloon-5', d: ell(545, 350, 76, 92) }, { id: 'balloon-6', d: ell(690, 372, 72, 88) },
        { id: 'gift', d: rect(390, 580, 220, 170, 14) },
        { id: 'ribbon', d: cross(500, 665, 110, 85, 24) },
        { id: 'bow', d: bowPath(500, 578, .66) }
      ]
    },
    {
      id: 'pinata', name: 'Piñata', group: 'birthday', sections: [
        { id: 'sky', d: rect(0, 0, 1000, 800), det: [{ d: line(450, 130, 450, 362), w: 8 }] },
        sun(130, 250, 58), ground(650),
        { id: 'branch', d: thick([[0, 118], [300, 92], [700, 104], [1000, 70]], 30) },
        { id: 'legs', d: compound(rect(300, 520, 58, 180, 22), rect(375, 530, 58, 170, 22), rect(500, 530, 58, 170, 22), rect(562, 520, 58, 180, 22)) },
        { id: 'tail', d: leaf(288, 402, 196, 530, 30) },
        { id: 'neck', d: rpoly([[538, 385], [612, 385], [642, 282], [565, 270]], 18) },
        { id: 'band-4', d: rectBot(280, 500, 340, 60, 30) },
        { id: 'band-3', d: scallop(280, 450, 340, 60, 6, 14) },
        { id: 'band-2', d: scallop(280, 400, 340, 60, 6, 14) },
        { id: 'band-1', d: scallopR(280, 360, 340, 50, 6, 14, 30) },
        { id: 'ears', d: compound(leaf(602, 228, 568, 108, 46), leaf(638, 222, 684, 106, 46)) },
        { id: 'head', d: ell(650, 268, 102, 64, 10), det: [...eye(630, 250, 12), blush(650, 290, 16)] },
        { id: 'snout', d: ell(732, 290, 46, 42), det: [{ d: ell(742, 282, 7, 10), f: INK }, smile(725, 312, 20, 12, 6)] },
        { id: 'candies', d: compound(wrapped(150, 720, 72, 30, -10), wrapped(850, 730, 72, 30, 12)) }
      ]
    },
    {
      id: 'surprise', name: 'Surprise present', group: 'birthday', sections: [
        { id: 'wall', d: rect(0, 0, 1000, 600) }, { id: 'floor', d: rect(0, 580, 1000, 220) },
        stars([[150, 150, 46], [850, 140, 46], [140, 420, 38], [880, 420, 40]]),
        { id: 'ears', d: compound(circ(405, 215, 46), circ(595, 215, 46)) },
        { id: 'head', d: ell(500, 315, 135, 118), det: [...face(500, 300, 125, { smile: false }), blush(410, 345, 20), blush(590, 345, 20)] },
        { id: 'muzzle', d: ell(500, 362, 60, 44), det: [nose(500, 345, 17), smile(500, 368, 24, 18, 7)] },
        { id: 'box', d: rect(330, 470, 340, 280, 16) },
        { id: 'ribbon', d: rect(470, 470, 60, 280) },
        { id: 'paws', d: compound(ell(400, 472, 44, 36), ell(600, 472, 44, 36)) },
        { id: 'lid', d: rpoly(turn(box(100, 280, 250, 72), 225, 316, -20), 14) },
        { id: 'lid-ribbon', d: poly(turn(box(195, 280, 60, 72), 225, 316, -20)) },
        { id: 'bow', d: bowPath(212, 276, .6) }
      ]
    },
    {
      id: 'bdaylion', name: 'Birthday lion', group: 'birthday', sections: [
        { id: 'wall', d: rect(0, 0, 1000, 800), det: [{ d: curve([[150, 280], [140, 420], [170, 560]]), w: 6 }, { d: curve([[860, 270], [870, 420], [840, 560]]), w: 6 }] },
        { id: 'balloons', d: compound(ell(150, 200, 64, 80), ell(860, 190, 64, 80)) },
        { id: 'body', d: ell(500, 720, 190, 120) },
        { id: 'mane', d: fluffy(500, 410, 250, 230, 16, .1) },
        { id: 'ears', d: compound(circ(345, 255, 48), circ(655, 255, 48)) },
        { id: 'face', d: ell(500, 430, 170, 150), det: [...eye(440, 400, 16), ...eye(560, 400, 16), blush(405, 465, 22), blush(595, 465, 22)] },
        { id: 'muzzle', d: ell(500, 492, 96, 58), det: [{ d: circ(455, 495, 6), f: INK }, { d: circ(475, 510, 6), f: INK }, { d: circ(545, 495, 6), f: INK }, { d: circ(525, 510, 6), f: INK }, smile(500, 515, 34, 22, 7)] },
        { id: 'nose', d: rpoly([[460, 436], [540, 436], [500, 498]], 12) },
        { id: 'bow-l', d: rpoly([[500, 650], [400, 605], [400, 695]], 14) }, { id: 'bow-r', d: rpoly([[500, 650], [600, 605], [600, 695]], 14) },
        { id: 'knot', d: circ(500, 650, 30) },
        { id: 'crown', d: rpoly([[360, 262], [360, 132], [412, 186], [456, 112], [500, 176], [544, 112], [588, 186], [640, 132], [640, 262]], 10) },
        { id: 'jewels', d: compound(circ(430, 222, 26), circ(500, 218, 26), circ(570, 222, 26)) }
      ]
    }
  ];
  add(B);

  /* ================================================================ Hanukkah and winter lights */
  // A Hanukkah menorah (hanukkiah) has nine lights: eight in a row and the helper candle, the shamash, set apart (here raised in the middle).
  const NUN = [[-14, -52], [8, -52], [8, 50], [-30, 50]];
  const GIMEL = [[[-14, -52], [6, -52], [14, 50]], [[12, 22], [-20, 56]]];
  const sheer = (pts, x0, y0, k) => pts.map(([x, y]) => [x0 + x, y0 + y + x * k]);
  const strokes = (list, w = 14) => list.map(pts => ({ d: 'M' + pts.map(([x, y]) => P(x, y)).join('L'), w }));
  const H = [
    {
      id: 'menorah', name: 'Menorah', group: 'hanukkah', sections: [
        { id: 'wall', d: rect(0, 0, 1000, 640) }, { id: 'table', d: rect(0, 620, 1000, 180) },
        { id: 'base', d: rpoly([[400, 742], [600, 742], [568, 660], [432, 660]], 16) },
        { id: 'stem', d: rect(475, 500, 50, 170, 10) },
        { id: 'bar', d: rect(120, 468, 760, 52, 24) },
        { id: 'holder', d: rect(468, 300, 64, 190, 12) },
        { id: 'candles', d: compound(...[165, 250, 335, 420, 580, 665, 750, 835].map(x => rect(x - 25, 345, 50, 125, 10))) },
        { id: 'shamash', d: rect(475, 180, 50, 125, 10) },
        { id: 'flames', d: compound(...[165, 250, 335, 420, 580, 665, 750, 835].map(x => drop(x, 312, 26))) },
        { id: 'flame-s', d: drop(500, 147, 26) }
      ]
    },
    {
      id: 'dreidel', name: 'Dreidel', group: 'hanukkah', sections: [
        { id: 'wall', d: rect(0, 0, 1000, 620), det: [{ d: curve([[250, 330], [215, 420], [250, 510]]), w: 7 }, { d: curve([[750, 330], [785, 420], [750, 510]]), w: 7 }, { d: curve([[200, 360], [175, 420], [200, 480]]), w: 7 }, { d: curve([[800, 360], [825, 420], [800, 480]]), w: 7 }] },
        { id: 'floor', d: rect(0, 600, 1000, 200) },
        { id: 'stars', d: compound(hexagram(150, 150, 50), hexagram(850, 140, 46), hexagram(870, 420, 38)) },
        { id: 'coins', d: compound(ell(200, 705, 72, 44), ell(800, 712, 72, 44), ell(330, 760, 60, 36)), det: [{ d: ell(200, 705, 48, 28), w: 6 }, { d: ell(800, 712, 48, 28), w: 6 }, { d: ell(330, 760, 38, 22), w: 6 }] },
        { id: 'top', d: poly([[500, 250], [650, 290], [500, 330], [350, 290]]) },
        { id: 'face-l', d: poly([[350, 290], [500, 330], [500, 560], [350, 520]]), det: strokes([sheer(NUN, 425, 430, 40 / 150)]) },
        { id: 'face-r', d: poly([[500, 330], [650, 290], [650, 520], [500, 560]]), det: strokes(GIMEL.map(g => sheer(g, 575, 430, -40 / 150))) },
        { id: 'tip-l', d: poly([[350, 520], [500, 560], [500, 702]]) },
        { id: 'tip-r', d: poly([[500, 560], [650, 520], [500, 702]]) },
        { id: 'handle', d: rect(472, 168, 56, 128, 18) }
      ]
    },
    {
      id: 'latkes', name: 'Latkes', group: 'hanukkah', sections: [
        { id: 'wall', d: rect(0, 0, 1000, 560) },
        { id: 'window', d: rect(90, 70, 260, 240, 16), det: [{ d: line(220, 70, 220, 310), w: 8 }, { d: line(90, 190, 350, 190), w: 8 }] },
        { id: 'table', d: rect(0, 540, 1000, 260) },
        { id: 'plate', d: ell(420, 655, 280, 92) },
        { id: 'latke-1', d: ell(410, 665, 178, 50) },
        { id: 'latke-2', d: ell(432, 622, 172, 48), det: [{ d: curve([[330, 620], [350, 612], [372, 622]]), w: 6 }] },
        { id: 'latke-3', d: ell(415, 580, 166, 46), det: [{ d: curve([[300, 582], [322, 572], [344, 582]]), w: 6 }, { d: curve([[500, 590], [522, 580], [544, 590]]), w: 6 }] },
        { id: 'cream', d: spline([[350, 575], [380, 535], [420, 515], [460, 535], [490, 575], [420, 590]]) },
        { id: 'bowl', d: `M640 602A110 82 0 0 0 860 602Z` },
        { id: 'sauce', d: ell(750, 602, 110, 26) },
        { id: 'plate-2', d: ell(820, 742, 140, 40) },
        { id: 'donut', d: ell(820, 705, 96, 62), det: [{ d: circ(780, 690, 5), f: '#fff' }, { d: circ(800, 730, 5), f: '#fff' }, { d: circ(860, 720, 5), f: '#fff' }, { d: circ(850, 685, 5), f: '#fff' }] },
        { id: 'jelly', d: ell(822, 670, 34, 27) }
      ]
    },
    {
      id: 'hanuwindow', name: 'Window lights', group: 'hanukkah', sections: [
        { id: 'wall', d: rect(0, 0, 1000, 800) },
        { id: 'night', d: rect(220, 110, 560, 410) },
        { id: 'moon', d: crescent(340, 185, 56) },
        { id: 'snow', d: `M220 470Q400 430 560 465T780 450V520H220Z` },
        { id: 'frame', d: `M180 70H820V560H180ZM220 110V520H780V110Z` },
        { id: 'sill', d: rect(140, 540, 720, 62, 16) },
        { id: 'stand', d: rpoly([[440, 542], [560, 542], [530, 430], [470, 430]], 12) },
        { id: 'bar', d: rect(222, 385, 556, 50, 22) },
        { id: 'candles', d: compound(...[252, 314, 376, 438, 562, 624, 686, 748].map(x => rect(x - 25, 288, 50, 98, 10))) },
        { id: 'shamash', d: rect(475, 216, 50, 170, 10) },
        { id: 'flames', d: compound(...[252, 314, 376, 438, 562, 624, 686, 748].map(x => drop(x, 254, 25))) },
        { id: 'flame-s', d: drop(500, 182, 25) }
      ]
    },
    {
      id: 'hanustar', name: 'Shining star', group: 'hanukkah', sections: [
        sky(), moonCres(860, 140, 80),
        { id: 'stars', d: compound(hexagram(120, 150, 48), hexagram(160, 420, 40), hexagram(860, 400, 42)) },
        { id: 'snow', d: `M0 620C250 580 700 640 1000 590V800H0Z` },
        { id: 'houses', d: compound(rect(110, 620, 170, 150, 8), rect(415, 640, 170, 140, 8), rect(720, 615, 170, 155, 8)), det: [{ d: rect(150, 660, 50, 50, 6), f: INK }, { d: rect(455, 680, 50, 50, 6), f: INK }, { d: rect(760, 655, 50, 50, 6), f: INK }] },
        { id: 'roofs', d: compound(rpoly([[90, 630], [195, 540], [300, 630]], 12), rpoly([[395, 650], [500, 560], [605, 650]], 12), rpoly([[700, 625], [805, 535], [910, 625]], 12)) },
        { id: 'star', d: hexagram(500, 310, 225) },
        { id: 'hexagon', d: poly(Array.from({ length: 6 }, (_, i) => { const a = (-60 + i * 60) * D2R, k = 225 / Math.sqrt(3); return [500 + Math.cos(a) * k, 310 + Math.sin(a) * k]; })) },
        { id: 'small-star', d: hexagram(500, 310, 88) }
      ]
    },
    {
      id: 'snowglobe', name: 'Snow globe', group: 'hanukkah', sections: [
        { id: 'wall', d: rect(0, 0, 1000, 620) }, { id: 'table', d: rect(0, 600, 1000, 200) },
        { id: 'glass', d: circ(500, 340, 250), det: [{ d: crescent(390, 250, 120, 40, 112), f: 'rgba(255,255,255,.55)' }, ...[[330, 200], [620, 160], [700, 280], [430, 150], [560, 250], [300, 330]].map(([x, y]) => ({ d: circ(x, y, 9), f: '#fff' }))] },
        { id: 'snow', d: `M275.5 450Q400 420 500 450T724.5 450A250 250 0 0 1 275.5 450Z` },
        { id: 'tree', d: rpoly([[300, 470], [360, 290], [420, 470]], 22) },
        { id: 'house', d: rect(440, 370, 150, 110, 8), det: [{ d: rect(470, 395, 40, 40, 4), f: INK }] },
        { id: 'roof', d: rpoly([[420, 380], [515, 290], [610, 380]], 12) },
        { id: 'door', d: `M525 480V440A25 25 0 0 1 575 440V480Z` },
        { id: 'ball-l', d: circ(665, 470, 44) },
        { id: 'ball-h', d: circ(665, 400, 33), det: [{ d: circ(655, 395, 5), f: INK }, { d: circ(676, 395, 5), f: INK }] },
        { id: 'base', d: rpoly([[300, 560], [700, 560], [760, 720], [240, 720]], 26) },
        { id: 'base-band', d: rect(270, 615, 460, 52, 10) }
      ]
    }
  ];
  add(H);

  /* ================================================================ Lunar New Year */
  const lantern = (x, y, rx, ry, k) => [
    { id: 'cap-' + k, d: rect(x - 55, y - ry - 34, 110, 52, 12) },
    { id: 'tassel-' + k, d: rpoly([[x - 28, y + ry + 30], [x + 28, y + ry + 26], [x + 42, y + ry + 130], [x - 42, y + ry + 130]], 14), det: [{ d: line(x - 14, y + ry + 60, x - 18, y + ry + 125), w: 6 }, { d: line(x + 14, y + ry + 60, x + 18, y + ry + 125), w: 6 }] },
    { id: 'lantern-' + k, d: ell(x, y, rx, ry), det: [{ d: ell(x, y, rx * .5, ry), w: 7 }, { d: line(x, y - ry, x, y + ry), w: 7 }] },
    { id: 'base-' + k, d: rect(x - 55, y + ry - 18, 110, 52, 12) }
  ];
  const fishPts = L => [[.5, 0], [.36, -.17], [.1, -.22], [-.2, -.15], [-.4, -.05], [-.4, .05], [-.2, .15], [.1, .22], [.36, .17]].map(([a, b]) => [a * L, b * L]);
  const koi = (cx, cy, L, ang, k) => {
    const T = pts => turn(pts.map(([a, b]) => [cx + a, cy + b]), cx, cy, ang), at = (a, b) => T([[a * L, b * L]])[0];
    const eyeAt = at(.3, -.08), sp1 = at(-.02, -.06), sp2 = at(.2, .06);
    return [
      { id: 'tail-' + k, d: spline(T([[-.36, 0], [-.6, -.24], [-.68, -.12], [-.56, 0], [-.68, .12], [-.6, .24]].map(([a, b]) => [a * L, b * L]))) },
      { id: 'fins-' + k, d: compound(ell(...at(.1, -.22), .11 * L, .075 * L, ang - 35), ell(...at(.1, .22), .11 * L, .075 * L, ang + 35)) },
      { id: 'koi-' + k, d: spline(T(fishPts(L))), det: [...eye(eyeAt[0], eyeAt[1], .035 * L), { d: `M${P(...at(.46, -.03))}Q${P(...at(.52, -.1))} ${P(...at(.5, -.16))}`, w: 6 }, { d: `M${P(...at(.46, .03))}Q${P(...at(.52, .1))} ${P(...at(.5, .16))}`, w: 6 }] },
      { id: 'spot-' + k + '1', d: ell(sp1[0], sp1[1], .12 * L, .075 * L, ang + 10) },
      { id: 'spot-' + k + '2', d: ell(sp2[0], sp2[1], .09 * L, .065 * L, ang - 15) }
    ];
  };
  const pad = (cx, cy, r, a = 30) => `M${P(cx, cy)}L${P(cx + Math.cos((a - 11) * D2R) * r, cy + Math.sin((a - 11) * D2R) * r)}A${r} ${r} 0 1 0 ${P(cx + Math.cos((a + 11) * D2R) * r, cy + Math.sin((a + 11) * D2R) * r)}Z`;
  const dumpling = (x, y, s = 1) => `M${P(x - 72 * s, y + 18 * s)}Q${P(x - 62 * s, y - 58 * s)} ${P(x, y - 62 * s)}Q${P(x + 62 * s, y - 58 * s)} ${P(x + 72 * s, y + 18 * s)}Q${P(x, y + 44 * s)} ${P(x - 72 * s, y + 18 * s)}Z`;
  const pleats = (x, y, s = 1) => [-36, -12, 12, 36].map(dx => ({ d: `M${P(x + dx * s, y - 52 * s)}Q${P(x + dx * s + 8, y - 34 * s)} ${P(x + dx * s, y - 20 * s)}`, w: 6 }));
  const L = [
    {
      id: 'lanterns', name: 'Lanterns', group: 'lunar', sections: [
        { id: 'sky', d: rect(0, 0, 1000, 800), det: [{ d: line(220, 96, 220, 155), w: 7 }, { d: line(500, 96, 500, 255), w: 7 }, { d: line(780, 96, 780, 155), w: 7 }] },
        { id: 'moon', d: circ(870, 660, 72) },
        { id: 'beam', d: rect(-20, 40, 1040, 58, 20) },
        ...lantern(220, 300, 140, 115, 'a'), ...lantern(780, 300, 140, 115, 'c'), ...lantern(500, 400, 130, 115, 'b'),
        { id: 'branch', d: thick([[0, 745], [180, 705], [400, 728]], 24) },
        { id: 'blossoms', d: flowers5([[110, 690, 46], [270, 680, 46], [390, 735, 44]]) }, { id: 'centers', d: centers([[110, 690, 46], [270, 680, 46], [390, 735, 44]]) }
      ]
    },
    {
      id: 'dragon', name: 'Friendly dragon', group: 'lunar', sections: (() => {
        const path = Array.from({ length: 49 }, (_, i) => { const x = 60 + i * 13.4, t = (x - 60) / 640; return [x, 560 - t * 150 + 75 * Math.sin(t * Math.PI * 3)]; });
        const segs = [0, 8, 16, 24, 32, 40].map((a, i) => ({ id: 'seg-' + (i + 1), d: thick(path.slice(a, Math.min(48, a + 8) + 1), 50) }));
        const spines = [4, 12, 20, 28, 36, 44].map(i => { const [x, y] = path[i], [x2, y2] = path[i + 1], l = Math.hypot(x2 - x, y2 - y), nx = (y2 - y) / l, ny = -(x2 - x) / l, tx = (x2 - x) / l, ty = (y2 - y) / l, h = 40 + i * .6; return rpoly([[x - tx * 30 + nx * 20, y - ty * 30 + ny * 20], [x + nx * (h + 50), y + ny * (h + 50)], [x + tx * 30 + nx * 20, y + ty * 30 + ny * 20]], 8); });
        return [
          sky(), plainCloud(180, 140, 1, 'cloud-a'), plainCloud(560, 110, .8, 'cloud-b'),
          { id: 'pearl', d: circ(905, 170, 52), det: [{ d: curve([[880, 170], [895, 150], [920, 160], [915, 185]]), w: 7 }] },
          { id: 'spines', d: compound(...spines) },
          { id: 'tail-fin', d: rpoly([[70, 560], [10, 470], [30, 610]], 14) },
          { id: 'legs', d: compound(ell(path[13][0], path[13][1] + 62, 30, 48, 10), ell(path[33][0], path[33][1] + 62, 30, 48, -10)) },
          ...segs.reverse().reverse(),
          { id: 'mane', d: polar(740, 360, t => 150 * (1 - .22 + .22 * Math.abs(Math.cos(5 * t))), 180) },
          { id: 'horns', d: compound(leaf(720, 250, 650, 140, 26), leaf(790, 250, 840, 130, 26)) },
          { id: 'head', d: spline([[650, 330], [700, 265], [790, 255], [850, 300], [870, 370], [820, 440], [720, 450], [660, 410]]), det: [...eyeWhite(735, 320, 26, 4), ...eyeWhite(805, 318, 24, 4), { d: curve([[712, 286], [735, 276], [758, 288]]), w: 7 }, { d: curve([[785, 284], [805, 276], [828, 288]]), w: 7 }] },
          { id: 'snout', d: ell(850, 395, 80, 52), det: [{ d: ell(840, 380, 7, 9), f: INK }, { d: ell(872, 380, 7, 9), f: INK }, smile(845, 410, 40, 24), { d: curve([[910, 395], [950, 380], [975, 400]]), w: 6 }, { d: curve([[905, 415], [945, 420], [965, 445]]), w: 6 }] }
        ];
      })()
    },
    {
      id: 'envelopes', name: 'Red envelopes', group: 'lunar', sections: [
        { id: 'wall', d: rect(0, 0, 1000, 660) }, { id: 'table', d: rect(0, 640, 1000, 160) },
        { id: 'branch', d: thick([[1010, 80], [850, 130], [700, 110]], 25) },
        { id: 'blossoms', d: flowers5([[930, 95, 44], [800, 140, 46], [690, 95, 42]]) }, { id: 'centers', d: centers([[930, 95, 44], [800, 140, 46], [690, 95, 42]]) },
        ...[['a', 130, 250, -10], ['b', 380, 240, 7]].flatMap(([k, x, y, a]) => {
          const cx = x + 110, cy = y + 160, c = turn([[cx, cy + 30]], cx, cy, a)[0];
          return [
            { id: 'env-' + k, d: rpoly(turn(box(x, y, 220, 320), cx, cy, a), 16) },
            { id: 'flap-' + k, d: rpoly(turn([[x + 6, y + 6], [x + 214, y + 6], [x + 110, y + 118]], cx, cy, a), 10) },
            { id: 'medal-' + k, d: circ(c[0], c[1], 56), det: [{ d: circ(c[0], c[1], 40), w: 6 }, { d: rpoly(turn(box(c[0] - 14, c[1] - 14, 28, 28), c[0], c[1], a), 3), w: 6 }] }
          ];
        }),
        { id: 'plate', d: ell(765, 690, 205, 52) },
        { id: 'orange-l', d: circ(690, 600, 72), det: [{ d: circ(690, 545, 5), f: INK }] }, { id: 'orange-r', d: circ(840, 600, 72) },
        { id: 'orange-top', d: circ(765, 480, 72), det: [{ d: circ(765, 425, 5), f: INK }] },
        { id: 'leaf', d: leaf(765, 412, 848, 352, 30) }
      ]
    },
    {
      id: 'koi', name: 'Lucky fish', group: 'lunar', sections: [
        { id: 'water', d: rect(0, 0, 1000, 800), det: [{ d: curve([[300, 120], [340, 108], [380, 120]]), w: 6 }, { d: curve([[600, 720], [640, 708], [680, 720]]), w: 6 }, { d: curve([[100, 520], [140, 508], [180, 520]]), w: 6 }] },
        { id: 'pad-a', d: pad(150, 160, 95, 20) }, { id: 'pad-b', d: pad(860, 170, 72, 160) }, { id: 'pad-c', d: pad(840, 660, 110, 300) },
        { id: 'petal-1', d: leaf(840, 650, 760, 555, 36) }, { id: 'petal-2', d: leaf(840, 650, 920, 555, 36) }, { id: 'petal-3', d: leaf(840, 655, 730, 620, 46) }, { id: 'petal-4', d: leaf(840, 655, 950, 620, 46) }, { id: 'petal-5', d: leaf(840, 650, 840, 525, 54) },
        ...koi(400, 330, 380, -20, 'a'), ...koi(560, 560, 340, 160, 'b'),
        { id: 'bubbles', d: compound(circ(640, 220, 28), circ(690, 160, 26), circ(300, 650, 28)) }
      ]
    },
    {
      id: 'dumplings', name: 'Dumplings', group: 'lunar', sections: [
        { id: 'wall', d: rect(0, 0, 1000, 560), det: [{ d: curve([[400, 380], [380, 330], [405, 290], [385, 240]]), w: 7 }, { d: curve([[500, 370], [480, 320], [505, 280], [485, 230]]), w: 7 }, { d: curve([[600, 380], [580, 330], [605, 290], [585, 240]]), w: 7 }] },
        { id: 'table', d: rect(0, 540, 1000, 260) },
        { id: 'spout', d: rpoly([[900, 470], [975, 392], [995, 414], [925, 512]], 14) },
        { id: 'handle', d: ring(735, 470, 58, 32) },
        { id: 'teapot', d: ell(830, 475, 108, 90) },
        { id: 'lid', d: `M770 394A60 54 0 0 1 890 394Z` },
        { id: 'rim', d: ell(460, 510, 215, 52) },
        { id: 'dumpling-1', d: dumpling(385, 498, .9), det: pleats(385, 498, .9) }, { id: 'dumpling-2', d: dumpling(535, 492, .9), det: pleats(535, 492, .9) },
        { id: 'dumpling-3', d: dumpling(460, 540, .95), det: pleats(460, 540, .95) },
        { id: 'band', d: `M245 510A215 52 0 0 0 675 510V650Q460 700 245 650Z`, det: [{ d: `M${P(245, 590)}Q${P(460, 640)} ${P(675, 590)}`, w: 7 }] },
        { id: 'dish', d: ell(810, 650, 112, 42) },
        { id: 'sauce', d: ell(810, 644, 80, 26) },
        { id: 'cup', d: rpoly([[70, 575], [210, 575], [192, 672], [88, 672]], 18) }
      ]
    },
    {
      id: 'liondance', name: 'Lion dance', group: 'lunar', sections: [
        sky(), { id: 'street', d: rect(0, 640, 1000, 160) },
        { id: 'cloth', d: spline([[600, 470], [770, 390], [910, 440], [985, 580], [910, 720], [720, 760], [580, 700]]), det: [{ d: curve([[720, 700], [800, 690], [880, 660]]), w: 7 }] },
        { id: 'mane', d: fluffy(450, 410, 285, 255, 18, .08) },
        { id: 'ears', d: compound(ell(232, 250, 64, 40, -30), ell(668, 250, 64, 40, 30)) },
        { id: 'head', d: ell(450, 410, 222, 192), det: [...eyeWhite(370, 382, 42, 4), ...eyeWhite(530, 382, 42, -4)] },
        { id: 'horn', d: rpoly([[418, 236], [482, 236], [450, 150]], 10) },
        { id: 'mirror', d: circ(450, 278, 38) },
        { id: 'brows', d: compound(fluffy(365, 322, 72, 32, 8, .16), fluffy(535, 322, 72, 32, 8, .16)) },
        { id: 'cheeks', d: compound(circ(282, 478, 42), circ(618, 478, 42)) },
        { id: 'nose', d: ell(450, 452, 62, 40) },
        { id: 'mouth', d: `M310 510Q450 650 590 510Q450 560 310 510Z`, det: [{ d: rpoly([[400, 534], [430, 538], [415, 562]], 3), f: '#fff' }, { d: rpoly([[470, 538], [500, 534], [485, 562]], 3), f: '#fff' }] },
        { id: 'beard', d: fluffy(450, 625, 110, 48, 10, .14) }
      ]
    }
  ];
  add(L);

  const GROUPS = [
    { id: 'valentine', name: "Valentine's Day", theme: 'valentine', tint: '#ffe0e6', edge: '#f28b9b', emblem: 'lovebear', demo: [['sky', 18], ['ground', 3], ['hearts-1', 0], ['hearts-2', 9], ['ears-1', 11], ['ears-2', 11], ['head', 11], ['body', 11], ['muzzle', 10], ['heart', 14], ['arms-1', 11], ['arms-2', 11]] },
    { id: 'easter', name: 'Easter and spring', theme: 'easter', tint: '#fff4c7', edge: '#f2d36b', emblem: 'eggbasket', demo: [['sky', 18], ['ground', 3], ['sun', 2], ['egg-1', 9], ['egg-2', 17], ['egg-3', 2], ['egg-4', 20], ['basket', 11], ['rim', 11], ['handle', 11], ['egg-l', 6], ['band-l', 0], ['egg-r', 2], ['band-r', 8]] },
    { id: 'summer', name: 'Summer fun', theme: 'summer', tint: '#d4f1ff', edge: '#7fc9ef', emblem: 'beachday', demo: [['sky', 18], ['sun', 2], ['sea', 7], ['sand', 10], ['canopy-l', 14], ['canopy-m', 23], ['canopy-r', 14], ['ball', 23], ['stripe-l', 7], ['stripe-r', 2], ['bucket', 0], ['bucket-rim', 2], ['towel', 5], ['sail', 23], ['hull', 0], ['starfish', 1]] },
    { id: 'birthday', name: 'Birthday party', theme: 'birthday', tint: '#f6e0ff', edge: '#d49af0', emblem: 'bdaycake', demo: [['wall', 20], ['table', 11], ['bunting-1', 0], ['bunting-2', 2], ['bunting-3', 7], ['bunting-4', 3], ['bunting-5', 8], ['bunting-6', 1], ['balloon-l', 9], ['balloon-r', 6], ['stand', 18], ['tier-1', 9], ['icing-1', 23], ['tier-2', 6], ['icing-2', 23], ['tier-3', 2], ['icing-3', 23], ['candles-1', 0], ['candles-2', 7], ['candles-3', 3], ['flames-1', 1], ['flames-2', 1], ['flames-3', 1]] },
    { id: 'hanukkah', name: 'Hanukkah and winter lights', theme: 'hanukkah', tint: '#dde8ff', edge: '#8fa9ec', emblem: 'menorah', demo: [['wall', 18], ['table', 19], ['base', 16], ['stem', 16], ['bar', 16], ['holder', 16], ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => ['candles-' + i, i % 2 ? 7 : 23]), ['shamash', 7], ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => ['flames-' + i, 2]), ['flame-s', 2]] },
    { id: 'lunar', name: 'Lunar New Year', theme: 'lunar', tint: '#ffe0d6', edge: '#f08f72', emblem: 'lanterns', demo: [['sky', 19], ['moon', 2], ['beam', 11], ...['a', 'b', 'c'].flatMap(k => [['lantern-' + k, 14], ['cap-' + k, 16], ['base-' + k, 16], ['tassel-' + k, 16]]), ['branch', 11], ['blossoms-1', 9], ['blossoms-2', 9], ['blossoms-3', 9]] }
  ];
  SPG.pictureGroups.push(...GROUPS);
})();
