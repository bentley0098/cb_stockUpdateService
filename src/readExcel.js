const XLSX = require("xlsx");

function readExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const headerRow = jsonData[0];
  const dataRows = jsonData.slice(1);

  const result = dataRows.map((row) => {
    const obj = {};
    headerRow.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });

  return result;
}

module.exports = { readExcel };