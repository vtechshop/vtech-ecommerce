# FILE: scripts/seed.sh
#!/bin/bash

echo "🌱 Seeding database..."

cd "$(dirname "$0")/../apps/api"

node src/seed/seed.js

echo "✅ Seed completed!"