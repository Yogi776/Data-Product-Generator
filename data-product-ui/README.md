# Data Product Generator UI

A modern, user-friendly web interface for generating comprehensive data product structures. This application provides both simple and advanced modes for creating data products with visual entity builders and real-time configuration previews.

## Features

### 🚀 Core Functionality
- **Simple Mode**: Quick data product generation with basic configuration
- **Advanced Mode**: Visual entity builder with dimensions and relationships
- **Real-time Preview**: Live YAML configuration preview
- **API Integration**: Seamless integration with the CLI data product generator
- **File Generation**: Automatic generation of all required data product files

### 🎨 User Experience
- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Tabbed Interface**: Organized configuration sections
- **Visual Entity Builder**: Drag-and-drop style entity management
- **Real-time Validation**: Form validation with helpful error messages
- **Progress Indicators**: Loading states and success/error feedback

### 📊 Data Product Components
- **SODP (Source of Data Product)**: Source layer entities
- **CODP (Consumption of Data Product)**: Consumption layer configuration
- **Semantic Entities**: Business logic entities
- **Dimensions**: Entity attributes with types and constraints
- **Relationships**: Entity joins and relationships
- **Quality Checks**: Data quality monitoring
- **Deployment Configs**: Kubernetes and deployment templates

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Access to the data-product-generator-cli

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd data-product-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### Simple Mode
1. Navigate to the home page
2. Fill in the basic configuration:
   - Project name (required)
   - Logical model, source, and schema
   - SODP entities (comma-separated)
   - CODP layer name
   - Semantic entities (optional)
3. Click "Generate Data Product"
4. View results and download generated files

### Advanced Mode
1. Click "Advanced Builder" from the home page
2. Configure basic project settings
3. Use the visual entity builder to:
   - Add entities with custom names
   - Define dimensions with types and constraints
   - Set up relationships and joins
   - Configure primary keys
4. Preview the generated YAML configuration
5. Generate the complete data product structure

## API Endpoints

### POST `/api/data-product`
Creates a new data product structure.

**Request Body:**
```json
{
  "projectName": "customer-360",
  "logicalModel": "analytics",
  "source": "icebase",
  "schema": "retail",
  "sodpEntities": ["customer", "product", "transaction"],
  "codpLayer": "analytics",
  "semanticEntities": ["customer", "product", "transaction"],
  "configPath": "optional/custom/path.yaml"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data product structure created successfully",
  "output": "CLI output...",
  "projectName": "customer-360",
  "generatedFiles": ["file1.yaml", "file2.sql", ...]
}
```

### GET `/api/templates`
Returns available configuration templates.

**Query Parameters:**
- `type`: Template type (config, sodp, model)

## Project Structure

```
data-product-ui/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── data-product/
│   │   │   │   └── route.ts          # Main API endpoint
│   │   │   └── templates/
│   │   │       └── route.ts          # Template API
│   │   ├── advanced/
│   │   │   └── page.tsx              # Advanced builder page
│   │   ├── globals.css               # Global styles
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Home page
│   └── components/
│       ├── EntityBuilder.tsx         # Visual entity builder
│       └── ConfigPreview.tsx         # YAML preview component
├── public/                           # Static assets
├── package.json                      # Dependencies
└── README.md                         # This file
```

## Configuration Examples

### Basic Configuration
```yaml
logical_model: analytics
source: icebase
schema: retail

entities:
  customer:
    dimensions:
      - name: customer_id
        type: number
        primary_key: true
      - name: customer_name
        type: string
      - name: customer_email
        type: string
```

### Advanced Configuration with Joins
```yaml
logical_model: analytics
source: icebase
schema: retail

entities:
  transaction:
    dimensions:
      - name: transaction_id
        type: number
        primary_key: true
      - name: customer_id
        type: number
      - name: product_id
        type: number
      - name: transaction_amount
        type: number
    joins:
      - name: customer
        relationship: many_to_one
        sql: "{TABLE.customer_id} = {customer.customer_id}"
      - name: product
        relationship: many_to_one
        sql: "{TABLE.product_id} = {product.product_id}"
```

## Generated Files

The application generates a comprehensive set of files for each data product:

### Core Files
- `config.yaml` - Main configuration
- `model.yaml` - Data model definition
- `user_groups.yaml` - User access configuration

### SODP Files
- `sodp.yaml` - Source of Data Product definition
- `bundle.yaml` - Data bundle configuration
- `flare.yaml` - Data pipeline configuration

### CODP Files
- `codp.yaml` - Consumption of Data Product definition
- `lens-deployment.yaml` - Kubernetes deployment
- `data-app-deployment.yaml` - Application deployment

### Quality & Monitoring
- `config-quality.yaml` - Data quality checks
- `config-quality-checks-failed.yaml` - Quality failure monitoring
- `config-workflow-failed.yaml` - Workflow failure monitoring
- `config-business-rules-lens.yaml` - Business rules monitoring

### SQL & Templates
- `sql/` - Generated SQL queries
- `templates/` - Configuration templates

## Development

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **UI Components**: Custom components with Radix UI primitives

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Environment Variables
Create a `.env.local` file for local development:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the CLI documentation for backend details

## Roadmap

- [ ] Drag-and-drop entity relationships
- [ ] Template library and sharing
- [ ] Version control integration
- [ ] Real-time collaboration
- [ ] Advanced validation rules
- [ ] Export to multiple formats
- [ ] Integration with data catalogs
- [ ] Performance monitoring dashboard
