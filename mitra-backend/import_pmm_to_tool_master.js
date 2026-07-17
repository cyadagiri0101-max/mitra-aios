const { DataSource } = require('typeorm');
const dotenv = require('dotenv');
const path = require('path');
const { spawnSync } = require('child_process');

dotenv.config();

class ToolMasterImportRunner {
  async run() {
    const pmmDbPath = path.resolve(process.cwd(), '..', 'pmm_data_library', 'pmm_database.db');
    const ds = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USERNAME || 'mitra_admin',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'mitra_v2',
      entities: [path.join(__dirname, 'dist/modules/tool-master/entities/tool-master.entity.js')],
      synchronize: false,
    });
    await ds.initialize();
    const repo = ds.getRepository('ToolMaster');
    const stats = { imported: 0, skippedDuplicates: 0, invalidRows: 0, categories: {}, duplicates: [] };
    const categories = [
      { key: 'blow_molds', type: 'BM', table: 'blow_molds', toolColumn: 'Normalized_Project_No', projectColumn: 'Description' },
      { key: 'injection_molds', type: 'IM', table: 'injection_molds', toolColumn: 'Normalized_Project_No', projectColumn: 'Description' },
      { key: 'job_works', type: 'BM', table: 'job_works', toolColumn: 'Job_No', projectColumn: 'Project_Description' },
      { key: 'commercial_molds', type: 'BM', table: 'commercial_molds', toolColumn: 'Prathiraj_Mold_No', projectColumn: 'Description' },
      { key: 'alpla_std_parts', type: 'BM', table: 'alpla_std_parts', toolColumn: 'Normalized_Project_No', projectColumn: 'Description' },
    ];

    for (const category of categories) {
      const result = spawnSync(process.env.PYTHON || 'python.exe', ['-c', `import sqlite3, json, sys; conn=sqlite3.connect(r'${pmmDbPath}'); cur=conn.cursor(); cur.execute("SELECT * FROM ${category.table}"); rows=cur.fetchall(); cols=[d[0] for d in cur.description]; print(json.dumps([dict(zip(cols,row)) for row in rows])) ; conn.close()`], { encoding: 'utf8' });
      if (result.status !== 0) throw new Error(result.stderr || result.stdout);
      const rows = JSON.parse(result.stdout);
      stats.categories[category.key] = rows.length;
      for (const row of rows) {
        const toolNo = String(row[category.toolColumn] || '').trim();
        const projectName = String(row[category.projectColumn] || '').trim() || null;
        if (!toolNo) { stats.invalidRows += 1; continue; }
        const existing = await repo.findOne({ where: { toolNo, tenantId: null } });
        if (existing) { stats.skippedDuplicates += 1; stats.duplicates.push({ category: category.key, toolNo }); continue; }
        await repo.save(repo.create({ toolNo, toolType: category.type, projectName, tenantId: null, createdBy: null, updatedBy: null }));
        stats.imported += 1;
      }
    }

    console.log(JSON.stringify(stats));
    await ds.destroy();
  }
}

new ToolMasterImportRunner().run().catch((err) => { console.error(err); process.exit(1); });
