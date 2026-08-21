#!/bin/bash
# Setup script to install all workspace dependencies

echo "=== Setting up LearnAI Monorepo ==="

echo "Installing frontend dependencies..."
cd frontend && npm install
cd ..

echo "Installing backend dependencies..."
cd backend && npm install
cd ..

echo "Checking python requirements for ML service..."
if [ -f "ml/requirements.txt" ]; then
    echo "Python dependencies defined in ml/requirements.txt. Install with 'pip install -r ml/requirements.txt' inside your python environment."
fi

echo "=== Setup complete! ==="
