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

1. **Configure Project**:
   - Enter a unique project name
   - Add multiple data product entities (e.g., "customer", "product", "order")
   - Specify a consumption layer name (e.g., "customer-360")
   - Optionally add custom semantic entities

2. **Preview Structure**:
   - Click "Preview" to see the generated file structure
   - The right panel shows a hierarchical view of all files
   - See both source-aligned data products and consumer-aligned consumption layer

3. **Generate Project**:
   - Click "Generate Project" to create all YAML configuration files
   - View generation results and success/error messages
   - All files are generated according to the SODP structure

## Example Usage

### Creating a Multi-Entity Data Product Project

1. Configure the project:
   - **Project Name**: "customr"
   - **Data Product Entities**: "customer", "product"
   - **Consumption Layer**: "customer-360"
   - **Custom Semantic Entities**: (optional, defaults to data product entities)

2. Click "Preview" to see the structure

3. The file structure will be generated:
   ```
   customr/
   ├── Data Products:
   │   ├── customer/
   │   │   ├── build/
   │   │   │   ├── data-processing/config-customer-flare.yaml
   │   │   │   └── quality/config-customer-quality.yaml
   │   │   └── deploy/
   │   │       ├── config-customer-scanner.yaml
   │   │       ├── config-customer-bundle.yaml
   │   │       ├── config-customer-dp.yaml
   │   │       └── pipeline.yaml
   │   └── product/
   │       ├── build/
   │       └── deploy/
   └── Consumption Layer: customer-360/
       ├── activation/
       ├── build/
       │   ├── access-control/
       │   └── semantic-model/customer-360/model/
       │       ├── sqls/ (2 files)
       │       ├── tables/ (2 files)
       │       └── ...
       ├── deploy/
       └── observability/
   ```

4. Click "Generate Project" to create all configuration files

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
│   ├── page.tsx            # Main application page with interactive generator
│   └── globals.css         # Global styles
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
