"""Validation Report Generator."""
import json
from datetime import datetime
from pathlib import Path
from jinja2 import Template

from models import SessionLocal, ImportLog
from config import settings


HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>MEKB Import Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin: 20px 0; }
        .card { background: #ecf0f1; padding: 15px; border-radius: 6px; text-align: center; }
        .card .value { font-size: 28px; font-weight: bold; color: #2c3e50; }
        .card .label { font-size: 12px; color: #7f8c8d; text-transform: uppercase; }
        .card.success { background: #d4edda; }
        .card.warning { background: #fff3cd; }
        .card.error { background: #f8d7da; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #3498db; color: white; }
        tr:hover { background: #f1f1f1; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .badge-success { background: #28a745; color: white; }
        .badge-warning { background: #ffc107; color: black; }
        .badge-error { background: #dc3545; color: white; }
        .footer { margin-top: 40px; text-align: center; color: #95a5a6; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>MEKB Import Validation Report</h1>
        <p><strong>Batch ID:</strong> {{ batch_id }}</p>
        <p><strong>Generated:</strong> {{ generated_at }}</p>
        <p><strong>Status:</strong> <span class="badge badge-{{ 'success' if status == 'SUCCESS' else 'warning' if status == 'PARTIAL' else 'error' }}">{{ status }}</span></p>

        <h2>Summary</h2>
        <div class="summary">
            <div class="card"><div class="value">{{ files_processed }}</div><div class="label">Files Processed</div></div>
            <div class="card success"><div class="value">{{ records_imported }}</div><div class="label">Records Imported</div></div>
            <div class="card"><div class="value">{{ records_updated }}</div><div class="label">Records Updated</div></div>
            <div class="card warning"><div class="value">{{ duplicates_found }}</div><div class="label">Duplicates Found</div></div>
            <div class="card error"><div class="value">{{ errors_count }}</div><div class="label">Errors</div></div>
            <div class="card warning"><div class="value">{{ warnings_count }}</div><div class="label">Warnings</div></div>
        </div>

        <h2>Per-File Results</h2>
        <table>
            <thead><tr><th>File</th><th>Parser</th><th>Imported</th><th>Updated</th><th>Duplicates</th><th>Errors</th><th>Warnings</th></tr></thead>
            <tbody>
            {% for item in details %}
            <tr>
                <td>{{ item.file }}</td>
                <td>{{ item.parser or 'N/A' }}</td>
                <td>{{ item.imported or 0 }}</td>
                <td>{{ item.updated or 0 }}</td>
                <td>{{ item.duplicates or 0 }}</td>
                <td>{{ item.errors or 0 }}</td>
                <td>{{ item.warnings or 0 }}</td>
            </tr>
            {% endfor %}
            </tbody>
        </table>

        {% if error_list %}
        <h2>Errors</h2>
        <ul>
            {% for err in error_list %}
            <li style="color: #c0392b;">{{ err }}</li>
            {% endfor %}
        </ul>
        {% endif %}

        <div class="footer">
            Mitra Engineering Knowledge Base (MEKB) v1.0.0 &mdash; Independent from MITRA
        </div>
    </div>
</body>
</html>
"""


class ValidationReport:
    def __init__(self, batch_id: str):
        self.batch_id = batch_id

    def generate(self, pipeline_result: dict) -> Path:
        html = Template(HTML_TEMPLATE).render(
            batch_id=self.batch_id,
            generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            status=pipeline_result.get("status", "UNKNOWN"),
            files_processed=pipeline_result.get("files_processed", 0),
            records_imported=pipeline_result.get("records_imported", 0),
            records_updated=pipeline_result.get("records_updated", 0),
            duplicates_found=pipeline_result.get("duplicates_found", 0),
            errors_count=pipeline_result.get("errors", 0),
            warnings_count=pipeline_result.get("warnings", 0),
            details=pipeline_result.get("details", []),
            error_list=pipeline_result.get("error_list", []),
        )

        out_path = settings.EXPORT_DIR / f"validation_report_{self.batch_id}.html"
        out_path.write_text(html, encoding="utf-8")

        # Update log with path
        db = SessionLocal()
        try:
            log = db.query(ImportLog).filter_by(batch_id=self.batch_id).first()
            if log:
                log.validation_report_path = str(out_path)
                db.commit()
        finally:
            db.close()

        return out_path
