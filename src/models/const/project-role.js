module.exports = {
  sysAdmin: 'sysAdmin', // 系統管理員
  manager: 'manager', // 計畫管理員
  researcher: 'researcher', // 計畫研究員
  executor: 'executor', // 計畫執行者
  all() {
    return [this.sysAdmin, this.manager, this.researcher, this.executor];
  },
};
