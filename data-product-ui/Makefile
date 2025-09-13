

# Variables for production
PROD_DOCKER_USERNAME = rubiklabs
PROD_IMAGE_NAME = data-product-generator
PROD_VERSION = 1.2

# Variables for development
DEV_DOCKER_USERNAME = modern123
DEV_IMAGE_NAME = dataos-automation-dev
DEV_VERSION = 1.1

# Login to Docker Hub
# Login to Docker Hub (production)

# Login to Docker Hub (development)
dev-login:
	@echo "Logging into Docker Hub (Development)..."
	docker login -u $(DEV_DOCKER_USERNAME) -p $(DEV_DOCKER_PASSWORD)

# Build the Docker image (production)
prod-build:
	@echo "Building Docker image for production with version tag: $(PROD_VERSION)..."
	docker build -t $(PROD_DOCKER_USERNAME)/$(PROD_IMAGE_NAME):$(PROD_VERSION) .

# Build the Docker image (development)
dev-build:
	@echo "Building Docker image for development with version tag: $(DEV_VERSION)..."
	docker build -t $(DEV_DOCKER_USERNAME)/$(DEV_IMAGE_NAME):$(DEV_VERSION) .

# Push the Docker image to Docker Hub (production)
prod-push:  prod-build
	@echo "Pushing Docker image to Docker Hub (Production) with version tag: $(PROD_VERSION)..."
	docker push $(PROD_DOCKER_USERNAME)/$(PROD_IMAGE_NAME):$(PROD_VERSION)

# Push the Docker image to Docker Hub (development)
dev-push: dev-login dev-build
	@echo "Pushing Docker image to Docker Hub (Development) with version tag: $(DEV_VERSION)..."
	docker push $(DEV_DOCKER_USERNAME)/$(DEV_IMAGE_NAME):$(DEV_VERSION)

# Clean up local Docker images (production)
prod-clean:
	@echo "Cleaning up local Docker images (Production)..."
	docker rmi $(PROD_DOCKER_USERNAME)/$(PROD_IMAGE_NAME):$(PROD_VERSION) || true

# Clean up local Docker images (development)
dev-clean:
	@echo "Cleaning up local Docker images (Development)..."
	docker rmi $(DEV_DOCKER_USERNAME)/$(DEV_IMAGE_NAME):$(DEV_VERSION) || true

# Test build and push for production
prod-test: prod-build
	@echo "Testing Docker image for production with version tag: $(PROD_VERSION)..."
	docker push $(PROD_DOCKER_USERNAME)/$(PROD_IMAGE_NAME):$(PROD_VERSION)

# Test build and push for development
dev-test: dev-build
	@echo "Testing Docker image for development with version tag: $(DEV_VERSION)..."
	docker push $(DEV_DOCKER_USERNAME)/$(DEV_IMAGE_NAME):$(DEV_VERSION)

# Targets for development and production workflows
dev: dev-push
prod: prod-push