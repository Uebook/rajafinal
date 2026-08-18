import os
import pty
import sys

password = "Supply@12345#\n"

pid, fd = pty.fork()

if pid == 0:
    os.execvp('ssh', ['ssh', '-o', 'StrictHostKeyChecking=no', 'root@200.234.32.189'])
else:
    buffer = ""
    pass_sent = False
    cmd_sent = False
    
    # We copy local build artifacts via base64 tarball transfer
    deploy_cmds = (
        "cd /var/www/backend && npm run build && pm2 restart backend-api --update-env; "
        "pm2 list; "
        "exit\n"
    )
    
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
                
            if ('root@' in buffer or '#' in buffer) and pass_sent and not cmd_sent:
                cmd_sent = True
                os.write(fd, deploy_cmds.encode())
                buffer = ""
        except OSError:
            break
