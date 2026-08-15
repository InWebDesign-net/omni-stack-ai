module.exports = {
  apps: [
    {
      name: "omni-cms",
      cwd: "./cms",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 1337,
        HOST: "0.0.0.0"
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 1337,
        HOST: "0.0.0.0"
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "1G"
    },
    {
      name: "omni-web",
      cwd: "./web",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "0.0.0.0"
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 3000,
        HOST: "0.0.0.0"
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "1G"
    },
    {
      name: "omni-socket",
      cwd: "./socket",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 4000
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "500M"
    }
  ]
};
