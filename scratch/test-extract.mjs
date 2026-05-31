import fs from 'fs';
import pdfParse from 'pdf-parse';

async function run() {
  const dataBuffer = fs.readFileSync('scratch/Output_Test_Generator.pdf');
  const data = await pdfParse(dataBuffer);
  console.log("Text inside generated PDF:");
  console.log(data.text);
}
run();
