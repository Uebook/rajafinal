import os
import pty
import sys
import subprocess

password = "Supply@12345#\n"

# 1. Commit git changes
print("1. Committing git changes...")
subprocess.run(['git', 'add', '-A'], cwd='/Users/vansh/ReactProject/raja1', check=True)
subprocess.run(['git', 'commit', '-m', 'fix(upload): verify uploaded_files table and fix image URL HTTPS protocol for VPS'], cwd='/Users/vansh/ReactProject/raja1', check=False)
subprocess.run(['git', 'push', 'origin', 'main'], cwd='/Users/vansh/ReactProject/raja1', check=False)

# 2. Package backend-node
print("2. Packaging backend-node...")
subprocess.run([
    'tar', '--exclude=node_modules', '--exclude=.git',
    '-czf', '/tmp/backend_deploy.tar.gz',
    '-C', '/Users/vansh/ReactProject/raja1/backend-node', '.'
], check=True)

# 3. Package admin dist
print("3. Packaging admin dist...")
subprocess.run([
    'tar', '-czf', '/tmp/admin_deploy.tar.gz',
    '-C', '/Users/vansh/ReactProject/raja1/admin/dist', '.'
], check=True)

print("4. Deploying backend to VPS...")
pid, fd = pty.fork()

if pid == 0:
    ssh_proc = subprocess.Popen([
        'ssh', '-o', 'StrictHostKeyChecking=no', 'root@200.234.32.189',
        'tar -xzf - -C /var/www/backend/ && cd /var/www/backend && npm run build && fuser -k 5050/tcp || true && pm2 restart backend-api --update-env'
    ], stdin=subprocess.PIPE)
    
    with open('/tmp/backend_deploy.tar.gz', 'rb') as f:
        ssh_proc.stdin.write(f.read())
    ssh_proc.stdin.close()
    ssh_proc.wait()
    sys.exit(0)
else:
    buffer = ""
    pass_sent = False
    
    while True:
        try:
            data = os.read(fd, 1024).decode('utf-8', errors='ignore')
            if not data:
                break
            sys.stdout.write(data)
            sys.stdout.flush()
            buffer += data
            
            if 'password:' in buffer.lower() and not pass_sent:
                pass_sent = True
                os.write(fd, password.encode())
                buffer = ""
        except OSError:
            break

print("\n5. Deploying admin static files to VPS...")
pid2, fd2 = pty.fork()

if pid2 == 0:
    ssh_proc2 = subprocess.Popen([
        'ssh', '-o', 'StrictHostKeyChecking=no', 'root@200.234.32.189',
        'tar -xzf - -C /var/www/admin/'
    ], stdin=subprocess.PIPE)
    
    with open('/tmp/admin_deploy.tar.gz', 'rb') as f:
        ssh_proc2.stdin.write(f.read())
    ssh_proc2.stdin.close()
    ssh_proc2.wait()
    sys.exit(0)
else:
    buffer2 = ""
    pass_sent2 = False
    
    while True:
        try:
            data2 = os.read(fd2, 1024).decode('utf-8', errors='ignore')
            if not data2:
                break
            sys.stdout.write(data2)
            sys.stdout.flush()
            buffer2 += data2
            
            if 'password:' in buffer2.lower() and not pass_sent2:
                pass_sent2 = True
                os.write(fd2, password.encode())
                buffer2 = ""
        except OSError:
            break

print("\n=== LIVE DEPLOYMENT COMPLETE! ===")
