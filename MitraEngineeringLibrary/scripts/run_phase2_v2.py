import subprocess, sys

result = subprocess.run(
    [sys.executable, "D:/MitraEngineeringLibrary/scripts/phase2_validation.py"],
    capture_output=True, text=True, timeout=120
)
print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr)
