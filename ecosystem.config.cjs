module.exports = {
  apps: [
    {
      name: 'orbura',
      cwd: '/opt/orbura',
      script: '/usr/bin/node',
      args: 'node_modules/next/dist/bin/next start',
      env: {
        NODE_ENV: 'production',
        PORT: '3050',
        HOSTNAME: '127.0.0.1',
        NEXT_PUBLIC_APP_URL: 'https://orbura.famile.xyz',
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '2G',
      out_file: '/opt/orbura/logs/orbura.out.log',
      error_file: '/opt/orbura/logs/orbura.err.log',
      merge_logs: true,
      time: true,
    },
    // HTTPS is terminated by the box's Coolify/Traefik proxy (ports 80/443)
    // via a file-provider route at /data/coolify/proxy/dynamic/orbura.yaml,
    // which reaches this next-server directly via host.docker.internal:3050
    // and auto-issues a Let's Encrypt cert for orbura.famile.xyz. The box
    // firewall must allow the Traefik container to reach :3050 or HTTPS
    // requests hang. No Cloudflare tunnel needed, no nginx middle layer.
  ],
};
