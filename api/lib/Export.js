const xlsx = require("node-xlsx");
class Export {
  constructor() {}

  /**
   *
   * @param {Array} titles Excel tablosunun başlıkları
   * @param {Array} columns Excel tablosuna yazılacak verilerin isimleri
   * @param {Array} data Excel tablosuna yazılacak veriler
   * @returns
   */
  toExcel(titles, columns, data) {
    let rows = [];
    rows.push(titles);
    for (let i = 0; i < data.length; i++) {
      let row = [];
      for (let j = 0; j < columns.length; j++) {
        row.push(data[i][columns[j]]);
      }
      rows.push(row);
    }
    return xlsx.build([{ name: "Sheet", data: rows }]);
  }
}
module.exports = new Export();
