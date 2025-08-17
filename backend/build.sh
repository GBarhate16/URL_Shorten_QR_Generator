#!/bin/bash

# Build script for Render deployment

echo "Starting build process..."

# Upgrade pip and install build tools
pip install --upgrade pip setuptools wheel

# Install requirements
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Run migrations
echo "Running database migrations..."
python manage.py migrate --noinput

echo "Build completed successfully!"
