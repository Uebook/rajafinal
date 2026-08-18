import os
import pty
import sys
import base64

password = "Supply@12345#\n"

with open('/tmp/admin_dist.tar.gz', 'rb') as f:
    admin_b64 = base64.b64encode(f.read()).decode('utf-8')

with open('/tmp/backend_dist.tar.gz', 'rb') as f:
    backend_b64 = base64.b64encode(f.read()).decode('utf-8')

# Split base64 into chunks to safely echo over SSH
chunk_size = 50000

pid, fd = pty.fork()

if pid == 0:
    os.execvp('ssh', ['ssh', '-o', 'StrictHostKeyChecking=no', 'root@200.234.32.189'])
else:
    buffer = ""
    pass_sent = False
    step = 0
    
    while True:
        try:
            data = os.read(fd, 2048).decode('utf-8', errors='ignore')
            if not data:
                break
            sys.stdout.write(data)
            sys.stdout.flush()
            buffer += data
            
            if 'password:' in buffer.lower() and not pass_sent:
                pass_sent = True
                os.write(fd, password.encode())
                buffer = ""
                
            if ('root@' in buffer or '#' in buffer) and pass_sent:
                if step == 0:
                    print("\n[DEPLOY] Uploading Admin bundle...")
                    os.write(fd, b"rm -rf /tmp/admin_b64.txt && mkdir -p /var/www/admin/dist /var/www/backend/dist\n")
                    step = 1
                    buffer = ""
                elif step == 1:
                    print("\n[DEPLOY] Writing Admin Base64...")
                    for i in range(0, len(admin_b64), chunk_size):
                        chunk = admin_b64[i:i+chunk_size]
                        os.write(fd, f"echo '{chunk}' >> /tmp/admin_b64.txt\n".encode())
                    os.write(fd, b"base64 -d /tmp/admin_b64.txt | tar -xz -C /var/www/admin/dist/ && cp -r /var/www/admin/dist/* /var/www/admin/ && rm /tmp/admin_b64.txt\n")
                    step = 2
                    buffer = ""
                elif step == 2:
                    print("\n[DEPLOY] Uploading Backend bundle...")
                    os.write(fd, b"rm -rf /tmp/backend_b64.txt\n")
                    step = 3
                    buffer = ""
                elif step == 3:
                    print("\n[DEPLOY] Writing Backend Base64...")
                    for i in range(0, len(backend_b64), chunk_size):
                        chunk = backend_b64[i:i+chunk_size]
                        os.write(fd, f"echo '{chunk}' >> /tmp/backend_b64.txt\n".encode())
                    os.write(fd, b"base64 -d /tmp/backend_b64.txt | tar -xz -C /var/www/backend/dist/ && rm /tmp/backend_b64.txt\n")
                    step = 4
                    buffer = ""
                elif step == 4:
                    print("\n[DEPLOY] Restarting PM2 process and reloading Nginx...")
                    os.write(fd, b"pm2 restart backend-api --update-env && systemctl reload nginx && pm2 list && exit\n")
                    step = 5
                    buffer = ""
        except OSError:
            break
