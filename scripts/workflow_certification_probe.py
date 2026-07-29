import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

BASE = os.environ.get('PROBE_API_BASE', 'http://localhost:3001/api')
TOKEN = None
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '5432')
DB_USER = os.environ.get('DB_USERNAME', 'mitra_admin')
DB_PASS = os.environ.get('DB_PASSWORD', 'mitra_admin')
DB_NAME = os.environ.get('DB_NAME', 'mitra_v2')


def call(method, path, payload=None, token=None):
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        start = time.perf_counter()
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode('utf-8')
            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
            return resp.status, elapsed_ms, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            payload = json.loads(body)
        except Exception:
            payload = body
        return e.code, None, payload
    except Exception as e:
        return None, None, {'error': str(e)}


def db_query(sql):
    cmd = ['psql', '-h', DB_HOST, '-p', DB_PORT, '-U', DB_USER, '-d', DB_NAME, '-At', '-F', '\t', '-c', sql]
    env = os.environ.copy()
    env['PGPASSWORD'] = DB_PASS
    proc = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip())
    return proc.stdout.strip()


def db_row(sql):
    out = db_query(sql)
    if not out:
        return None
    return out.split('\t')


def login():
    global TOKEN
    password = os.environ.get('SEED_ADMIN_PASSWORD', 'E2eAdminPass!2026')
    status, _, body = call('POST', '/auth/login', {'email': 'admin@mitra.local', 'password': password})
    print('LOGIN_STATUS', status)
    if isinstance(body, dict) and 'access_token' in body:
        TOKEN = body['access_token']
        print('TOKEN_OK', TOKEN[:40] + '...')
    else:
        print('LOGIN_BODY', body)
        raise SystemExit(1)


def main():
    login()
    customer_payload = {
        'name': 'ABC Plastics Pvt Ltd',
        'industry': 'packaging',
        'attributes': {'region': 'APAC', 'tier': 'gold'},
        'contacts': [{
            'firstName': 'Engineering',
            'lastName': 'Manager',
            'email': 'eng@abcplastics.com',
            'phone': '+91-99999-11111',
            'role': 'engineering_manager',
            'isPrimary': True,
        }],
    }
    status, ms, body = call('POST', '/commercial/customers', customer_payload, TOKEN)
    print('CUSTOMER_STATUS', status)
    print('CUSTOMER_MS', ms)
    print('CUSTOMER_BODY', json.dumps(body, indent=2))
    customer_id = body['id']
    contact_id = body['contacts'][0]['id']

    enquiry_payload = {
        'customerName': 'ABC Plastics Pvt Ltd',
        'productName': '500 mL Bottle Blow Mold',
        'enquiryDate': '2026-07-29',
        'customerEmail': 'eng@abcplastics.com',
        'customerContact': 'Engineering Manager',
        'customerPhone': '+91-99999-11111',
        'moldType': 'BLOW',
        'cavitation': 4,
        'materialType': 'P20',
        'annualVolume': 500000,
        'source': 'EMAIL',
        'requiredDeliveryDate': '2026-09-30',
        'remarks': 'Prototype and production mold for bottle blow application',
    }
    status, ms, body = call('POST', '/commercial/enquiries', enquiry_payload, TOKEN)
    print('ENQUIRY_STATUS', status)
    print('ENQUIRY_MS', ms)
    print('ENQUIRY_BODY', json.dumps(body, indent=2))
    enquiry_id = body['id']

    quotation_payload = {
        'rfqId': enquiry_id,
        'customerId': customer_id,
        'amount': 1850000,
        'terms': {'payment_terms': '50% advance, 50% on delivery', 'delivery_weeks': 12, 'warranty_months': 12},
        'validUntil': '2026-09-27',
    }
    status, ms, body = call('POST', '/commercial/quotations', quotation_payload, TOKEN)
    print('QUOTATION_STATUS', status)
    print('QUOTATION_MS', ms)
    print('QUOTATION_BODY', json.dumps(body, indent=2))
    quotation_id = body['id']

    status, ms, body = call('POST', f'/commercial/quotations/{quotation_id}/send', {}, TOKEN)
    print('SEND_STATUS', status)
    print('SEND_MS', ms)
    print('SEND_BODY', json.dumps(body, indent=2))

    accept_payload = {'projectName': 'ABC Bottle Blow Mold Project'}
    status, ms, body = call('POST', f'/commercial/quotations/{quotation_id}/accept', accept_payload, TOKEN)
    print('ACCEPT_STATUS', status)
    print('ACCEPT_MS', ms)
    print('ACCEPT_BODY', json.dumps(body, indent=2))
    project_id = body['project']['id']

    # Read back entities
    status, ms, body = call('GET', f'/commercial/customers/{customer_id}', None, TOKEN)
    print('CUSTOMER_GET_STATUS', status)
    print('CUSTOMER_GET_MS', ms)
    print('CUSTOMER_GET_BODY', json.dumps(body, indent=2))

    status, ms, body = call('GET', f'/commercial/enquiries/{enquiry_id}', None, TOKEN)
    print('ENQUIRY_GET_STATUS', status)
    print('ENQUIRY_GET_MS', ms)
    print('ENQUIRY_GET_BODY', json.dumps(body, indent=2))

    status, ms, body = call('GET', f'/commercial/quotations/{quotation_id}', None, TOKEN)
    print('QUOTATION_GET_STATUS', status)
    print('QUOTATION_GET_MS', ms)
    print('QUOTATION_GET_BODY', json.dumps(body, indent=2))

    status, ms, body = call('GET', f'/project/{project_id}', None, TOKEN)
    print('PROJECT_GET_STATUS', status)
    print('PROJECT_GET_MS', ms)
    print('PROJECT_GET_BODY', json.dumps(body, indent=2))

    # DB evidence
    print('DB_CUSTOMER', db_row("SELECT id, name, status, tenant_id, created_at FROM customers WHERE id = '%s'" % customer_id))
    print('DB_CONTACT', db_row("SELECT id, customer_id, first_name, last_name, email, is_primary FROM contacts WHERE id = '%s'" % contact_id))
    print('DB_ENQUIRY', db_row("SELECT id, enquiry_number, customer_id, customer_name, product_name, status FROM enquiries WHERE id = '%s'" % enquiry_id))
    print('DB_QUOTATION', db_row("SELECT id, quotation_number, enquiry_id, customer_id, status, total_amount, approved_by, approved_at, project_id FROM quotations WHERE id = '%s'" % quotation_id))
    print('DB_PROJECT', db_row("SELECT id, project_number, name, customer_id, customer_name, product_name, stage, health_status, project_value FROM projects WHERE id = '%s'" % project_id))
    print('DB_AUDIT', db_query("SELECT entity_type, entity_id, action, event_type, user_id, tenant_id, created_at FROM audit_logs WHERE entity_id IN ('%s','%s','%s','%s') ORDER BY created_at DESC" % (customer_id, contact_id, enquiry_id, quotation_id)))

    # Business rule probes
    dup_status, dup_ms, dup_body = call('POST', '/commercial/customers', customer_payload, TOKEN)
    print('DUPLICATE_CUSTOMER_STATUS', dup_status)
    print('DUPLICATE_CUSTOMER_BODY', json.dumps(dup_body, indent=2))

    repeat_accept_status, repeat_accept_ms, repeat_accept_body = call('POST', f'/commercial/quotations/{quotation_id}/accept', accept_payload, TOKEN)
    print('REPEAT_ACCEPT_STATUS', repeat_accept_status)
    print('REPEAT_ACCEPT_BODY', json.dumps(repeat_accept_body, indent=2))

    direct_project_status, direct_project_ms, direct_project_body = call('POST', '/project', {'name': 'Direct Project Without Quotation', 'productName': 'Direct test', 'cavitation': 1}, TOKEN)
    print('DIRECT_PROJECT_STATUS', direct_project_status)
    print('DIRECT_PROJECT_BODY', json.dumps(direct_project_body, indent=2))


if __name__ == '__main__':
    main()
