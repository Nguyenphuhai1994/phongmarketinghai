// Nội thất dựng bằng hình khối Three.js sẵn có; nhân vật sinh hoạt không tham gia hàng công việc.
export function buildAmenities({ THREE, scene, X, Z, std, add }) {
  const box = (w, h, d, color, x, y, z, parent = scene) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(color)), x, y, z, parent);
  const round = (r, h, color, x, y, z, parent = scene) => add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), std(color)), x, y, z, parent);
  const lounge = new THREE.Group(); lounge.position.set(X(376), 0, Z(106)); scene.add(lounge);
  lounge.name = "Phòng ăn & nghỉ";
  // Bếp chữ I, mặt đá, chậu rửa và hai bếp từ.
  box(15, 2.6, 3.1, 0x35796e, -6, 1.3, -7.3, lounge);
  box(15.4, .25, 3.4, 0xfaf3e7, -6, 2.7, -7.3, lounge);
  for (const x of [-11, -7, -3]) box(.06, 2.2, .08, 0xddd4bd, x, 1.3, -5.7, lounge);
  box(3.3, .12, 1.9, 0x8fa5a0, -10, 2.87, -7.3, lounge);
  box(2.6, .08, 1.2, 0x314f51, -10, 2.95, -7.3, lounge);
  round(.07, 1.1, 0xd5dcda, -10, 3.3, -8.3, lounge);
  box(.8, .12, .12, 0xd5dcda, -9.65, 3.8, -8.3, lounge);
  box(3.4, .08, 2.5, 0x213b3e, -3, 2.88, -7.3, lounge);
  for (const x of [-3.8, -2.2]) round(.55, .05, 0x728b85, x, 2.95, -7.3, lounge);
  box(2.9, 5.2, 3.2, 0xe6ede7, 3.5, 2.6, -7.2, lounge);
  box(.12, 1.3, .18, 0x607c78, 4.4, 2.4, -5.5, lounge);
  // Hai giường đơn, chăn xanh và gối trắng.
  for (const z of [-4, 4]) {
    box(5.4, .8, 6.8, 0xb88b65, 10.2, .6, z, lounge);
    box(5.1, .65, 6.5, 0xf9f1e6, 10.2, 1.3, z, lounge);
    box(5.2, .2, 4.1, 0x7ba99a, 10.2, 1.72, z + .95, lounge);
    box(3.2, .45, 1.5, 0xffffff, 10.2, 1.85, z - 2, lounge);
    box(5.5, 2.5, .35, 0xb88b65, 10.2, 1.25, z - 3.4, lounge);
  }
  box(7, .25, 4, 0xe3b986, -7, 2.2, 2, lounge);
  for (const x of [-9.7, -4.3]) for (const z of [.7, 3.3]) box(.2, 2.1, .2, 0x406c63, x, 1.05, z, lounge);
  for (const x of [-9.5, -4.5]) for (const z of [-1, 5.2]) {
    box(1.8, .25, 1.8, 0xefbd70, x, 1.25, z, lounge);
    box(1.8, 1.7, .2, 0xefbd70, x, 2.05, z + (z < 0 ? -.8 : .8), lounge);
    round(.1, 1.15, 0x406c63, x, .6, z, lounge);
  }
  for (const x of [-8.5, -5.5]) { round(.7, .08, 0xffffff, x, 2.4, 2, lounge); round(.2, .5, 0xe48260, x + .7, 2.65, 1.5, lounge); }
  // Sân pickleball thu nhỏ: hai ô giao bóng mỗi bên, vùng bếp và lưới giữa sân.
  const court = new THREE.Group(); court.position.set(X(1029), 0, Z(170)); scene.add(court); court.name = "Phòng tập pickleball";
  box(33, .1, 31, 0x87b9a6, 0, .13, 0, court);
  box(25, .12, 28, 0x417c89, 0, .23, 0, court);
  box(25, .03, 9, 0x9dc6b7, 0, .31, 0, court);
  const stripe = (w, d, x, z) => box(w, .04, d, 0xf5f6dd, x, .35, z, court);
  for (const x of [-12.5, 12.5]) stripe(.16, 28, x, 0);
  for (const z of [-14, 14, -4.5, 4.5]) stripe(25, .16, 0, z);
  stripe(.16, 9.5, 0, -9.25); stripe(.16, 9.5, 0, 9.25);
  for (const x of [-13.2, 13.2]) round(.14, 2.8, 0xfaf1df, x, 1.5, 0, court);
  // Lưới có mắt thực, nhìn xuyên được thay vì một khối đặc.
  for (let x = -13; x <= 13; x += .65) box(.035, 2.2, .035, 0xe0e9de, x, 1.55, 0, court);
  for (let y = .5; y <= 2.7; y += .35) box(26, .035, .035, 0xe0e9de, 0, y, 0, court);
  box(26.7, .13, .13, 0xffffff, 0, 2.75, 0, court);
  box(8, .3, 1.8, 0xe0b587, 0, 1.3, 16.5, court);
  for (const x of [-3, 3]) box(.3, 1.2, 1.3, 0x376d63, x, .6, 16.5, court);
  function person(parent, x, z, color, rotation = 0, paddle = false) {
    const g = new THREE.Group(); parent.add(g); g.position.set(x, .15, z); g.rotation.y = rotation;
    add(new THREE.Mesh(new THREE.CapsuleGeometry(.65, 1.05, 6, 12), std(color)), 0, 1.65, 0, g);
    add(new THREE.Mesh(new THREE.SphereGeometry(.72, 16, 12), std(0xf9eddb)), 0, 3.2, 0, g);
    box(1.05, .3, .14, 0x2a5355, 0, 3.2, .64, g);
    for (const sx of [-1, 1]) { round(.18, 1.2, color, sx * .9, 1.6, 0, g); box(.4, .65, .65, 0x2c5554, sx * .35, .42, 0, g); }
    if (paddle) { round(.08, 1.1, 0x324c4b, 1.1, 1.8, .2, g); const face = round(.65, .16, 0xf3bd65, 1.1, 2.7, .2, g); face.rotation.x = Math.PI / 2; }
    return g;
  }
  const people = [person(lounge, -1.5, .5, 0xe58f6c, -.9), person(lounge, -10, 7, 0x749cb3, 2.6), person(lounge, -.8, -4.5, 0xc8aa66, Math.PI)];
  const players = [person(court, -5, -9, 0xeea06e, 0, true), person(court, 5, 9, 0xe9d791, Math.PI, true)];
  const ball = add(new THREE.Mesh(new THREE.SphereGeometry(.27, 12, 8), std(0xf7e56c)), 0, 3, 0, court);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (time) => {
    if (reduced) return;
    people.forEach((g, i) => { g.rotation.y += Math.sin(time * .6 + i) * .0006; });
    players.forEach((g, i) => { g.position.x = (i ? 5 : -5) + Math.sin(time * 1.5 + i * Math.PI) * 1.6; });
    ball.position.set(Math.sin(time * 1.5) * 5, 2 + Math.abs(Math.cos(time * 1.5)) * 3.5, Math.sin(time * 1.5) * 10);
  };
}
