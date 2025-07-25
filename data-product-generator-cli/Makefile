.PHONY: help test test-sodp test-codp install clean

help:
	@echo "Available commands:"
	@echo "  make test        - Generate customer-360 project (deletes existing and recreates)"
	@echo "  make test-sodp   - Generate only SODP for customer-360"
	@echo "  make test-codp   - Generate only CODP for customer-360"
	@echo "  make install     - Install the data product generator"
	@echo "  make clean       - Clean up generated projects"
	@echo ""
	@echo "Examples:"
	@echo "  make test        # Full project with both SODP and CODP"
	@echo "  make test-sodp   # Only Source of Data Product"
	@echo "  make test-codp   # Only Consumption of Data Product"

test:
	rm -rf customer-360
	dp-generator -p customer-360 -sodp customer,product,transaction -codp cust-360 -e customer,product,transaction,city

test-sodp:
	rm -rf customer-360
	dp-generator -p customer-360 -sodp customer,product,transaction

test-codp:
	rm -rf customer-360
	dp-generator -p customer-360 -codp cust-360 -e customer,product,transaction,city

install:
	chmod +x install.sh && ./install.sh

clean:
	rm -rf customer-360
