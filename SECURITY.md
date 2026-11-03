# Security

Please **do not open a public issue** for vulnerabilities.
Use GitHub's private reporting: **Security** tab → **Report a vulnerability**.

Include what you found, how to reproduce it, and the impact. You'll get a reply within a few days.

## Scope notes

- outlook-lite-mcp uses delegated Microsoft Graph permissions only and stores tokens locally (`~/.outlook-lite-mcp`, mode 600).
- Email content is untrusted input. Reply, forward, send and delete always require user confirmation;
  a bypass of that confirmation is in scope and treated as high severity.
