import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AppDataSourceOptions } from '../src/database/data-source';
import { ImporterService } from '../src/services/importer.service';

async function runSampleImport() {
  const dataSource = new DataSource(AppDataSourceOptions);
  await dataSource.initialize();

  const importer = new ImporterService(dataSource);
  const sampleFolder = process.env.SAMPLE_FOLDER || './sample-data';

  const sampleFiles = [
    'Blow Molds Cycle Times.xlsx',
    'Blow Molds Data for Internal Study.xlsx',
    'Blow Molds Data for Internal Study_RevA.xlsx',
    'BM Index Sheets.xlsx',
    'Process Planning Sheets.xlsx',
    'Part List workbooks.xlsx',
    'Component Details.xlsx',
  ];

  for (const fileName of sampleFiles) {
    const filePath = `${sampleFolder}/${fileName}`;
    try {
      await importer.importWorkbook(filePath, 'initial');
      console.log(`Imported ${fileName}`);
    } catch (error) {
      console.warn(`Skipping ${fileName}: ${error}`);
    }
  }

  await importer.importEngineeringTextFile(`${sampleFolder}/engineering-docs.txt`, 'initial');
  console.log('Imported text documents');
  await dataSource.destroy();
}

runSampleImport().catch((error) => {
  console.error(error);
  process.exit(1);
});
