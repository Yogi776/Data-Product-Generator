# Data Product Generator UI

A modern web application for creating Source Aligned Data Products (SODP) with automated file structure generation.

## Features

- **Interactive Form**: Create data products with name, entity, description, version, and author
- **Real-time Preview**: See the generated file structure as you create data products
- **File Tree Visualization**: Expandable/collapsible file tree showing the complete SODP structure
- **YAML Generation**: Generate actual YAML configuration files for each component
- **Download Options**: Download JSON structure or ZIP file with all YAML files
- **Validation**: Form validation to prevent duplicate entities and ensure required fields
- **Modern UI**: Clean, responsive design built with Next.js and Tailwind CSS

## Generated File Structure

For each data product, the following structure is generated:

```
<entity>/
├── build/
│   ├── data-processing/
│   │   └── config-<entity>-flare.yaml
│   └── quality/
│       └── config-<entity>-quality.yaml
└── deploy/
    ├── config-<entity>-scanner.yaml
    ├── config-<entity>-bundle.yaml
    ├── config-<entity>-dp.yaml
    └── pipeline.yaml
```

## Configuration Files

### 1. Flare Configuration (`config-<entity>-flare.yaml`)
- Data processing pipeline configuration
- Source connection settings
- SQL transformations
- Output configuration

### 2. Quality Configuration (`config-<entity>-quality.yaml`)
- Data quality checks (completeness, uniqueness, validity)
- Alerting configuration
- Reporting settings

### 3. Scanner Configuration (`config-<entity>-scanner.yaml`)
- Data scanning rules
- Incremental and full scan settings
- Monitoring and alerting

### 4. Bundle Configuration (`config-<entity>-bundle.yaml`)
- Component bundling
- Dependencies management
- Build and distribution settings

### 5. Data Product Configuration (`config-<entity>-dp.yaml`)
- Metadata and schema definition
- Access control settings
- Quality requirements and lineage

### 6. Pipeline Configuration (`pipeline.yaml`)
- End-to-end pipeline definition
- Stage dependencies
- Error handling and monitoring

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd data-product-ui
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Usage

1. **Create Data Products**:
   - Fill out the form on the left panel
   - Enter a unique entity name (e.g., "customer", "product", "order")
   - Add optional description, version, and author information
   - Click "Create Data Product"

2. **View File Structure**:
   - The right panel shows a live preview of the generated file structure
   - Click on folders to expand/collapse the tree view
   - See the complete SODP structure for all created data products

3. **Download Files**:
   - **Download JSON**: Get a JSON representation of the file structure
   - **Download YAML**: Get a ZIP file containing all generated YAML configuration files

## Example Usage

### Creating a Customer Data Product

1. Fill the form:
   - **Name**: "Customer Analytics"
   - **Entity**: "customer"
   - **Description**: "Customer data product for analytics and reporting"
   - **Version**: "1.0.0"
   - **Author**: "Data Team"

2. Click "Create Data Product"

3. The file structure will be generated:
   ```
   customer/
   ├── build/
   │   ├── data-processing/
   │   │   └── config-customer-flare.yaml
   │   └── quality/
   │       └── config-customer-quality.yaml
   └── deploy/
       ├── config-customer-scanner.yaml
       ├── config-customer-bundle.yaml
       ├── config-customer-dp.yaml
       └── pipeline.yaml
   ```

4. Download the YAML files to get the complete configuration

## Technology Stack

- **Frontend**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **File Generation**: Custom YAML generator
- **File Compression**: JSZip for ZIP file creation

## Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main application page
│   └── globals.css         # Global styles
├── components/
│   ├── DataProductForm.tsx # Form component for creating data products
│   └── FileTreePreview.tsx # File tree visualization component
├── types/
│   └── dataProduct.ts      # TypeScript type definitions
└── utils/
    └── yamlGenerator.ts    # YAML file generation utility
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
