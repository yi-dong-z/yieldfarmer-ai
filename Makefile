.PHONY: install backend frontend dev clean

install:
	@echo "Installing Python dependencies..."
	pip install -r agent/requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "✅ Done! Copy .env.example to .env and fill in your API keys."

backend:
	cd agent && python main.py

frontend:
	cd frontend && npm run dev

dev:
	@echo "Starting backend (port 8000) and frontend (port 3000)..."
	cd agent && python main.py &
	sleep 1
	cd frontend && npm run dev

clean:
	rm -rf agent/__pycache__ agent/*.pyc
	rm -rf frontend/.next frontend/out frontend/node_modules
