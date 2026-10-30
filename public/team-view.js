"use strict";
(function (root) {
  // Một nhân viên có nhiều lượt chạy nhưng chỉ giữ một nhân vật/bàn trên sơ đồ.
  function reconcile(views, incoming, { move = () => {}, remove = () => {} } = {}) {
    const seen = new Set(), agents = incoming.filter((a) => {
      const identity = a.employeeId ? "employee:" + a.employeeId : "session:" + a.key;
      if (seen.has(identity)) return false; seen.add(identity); return true;
    });
    for (const a of agents) {
      if (views[a.key] || !a.employeeId) continue;
      const oldKey = Object.keys(views).find((key) => views[key].employeeId === a.employeeId);
      if (!oldKey) continue;
      views[a.key] = views[oldKey]; delete views[oldKey]; move(oldKey, a.key, a);
    }
    const wanted = new Set(agents.map((a) => a.key));
    for (const key of Object.keys(views)) if (!wanted.has(key)) { remove(key, views[key]); delete views[key]; }
    return agents;
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { reconcile };
  else root.OfficeTeam = { reconcile };
})(typeof window !== "undefined" ? window : globalThis);
