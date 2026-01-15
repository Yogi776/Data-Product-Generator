import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    const { action, data } = body;
    
    // Validate action
    if (!action) {
      return NextResponse.json(
        { error: 'Missing action parameter', details: 'Action must be "generate-description" or "suggest-measures"' },
        { status: 400 }
      );
    }

    // Check API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.warn('OPENAI_API_KEY is not configured; skipping AI generation');
      if (action === 'suggest-measures') {
        return NextResponse.json(
          { measures: [], warning: 'OpenAI disabled: set OPENAI_API_KEY to enable AI suggestions.' }
        );
      }
      return NextResponse.json(
        { description: 'AI generation disabled. Set OPENAI_API_KEY to enable responses.' }
      );
    }

    let prompt = '';
    
    if (action === 'generate-description') {
      // Generate description for an existing measure
      const { measureName, measureType, measureSql, tableName, tableDescription, dimensions } = data;
      
      prompt = `You are a data analyst expert writing professional measure descriptions for a semantic data model using TRINO SQL.

Context:
- Table: ${tableName}
- Table Description: ${tableDescription || 'Business data table'}
- Measure Name: ${measureName}
- Measure Type: ${measureType}
- SQL Expression (Trino SQL): ${measureSql}
- Available Dimensions: ${dimensions.map((d: { name: string; type: string; description: string }) => `${d.name} (${d.type}): ${d.description}`).join(', ')}

Understanding Trino SQL in the expression:
- try_cast(x as double) = safely converts to number, returns null if invalid
- nullif(x, '') = treats empty strings as null
- date_diff('day', start, end) = calculates days between dates
- case when ... then ... end = conditional logic
- (x / nullif(y, 0) * 100) = percentage calculation with divide-by-zero protection

Generate a professional, business-focused description for this measure that:
1. Explains what the measure calculates in business terms (not technical SQL terms)
2. States the BUSINESS VALUE - why this metric matters to executives/managers
3. Identifies ACTIONABLE INSIGHTS - what decisions this metric enables
4. Mentions BUSINESS CONTEXT - what problems it solves or opportunities it reveals
5. Is 2-3 sentences structured as:
   - Sentence 1: WHAT it measures and its definition
   - Sentence 2: WHY it matters (business impact, risks, opportunities)  
   - Sentence 3 (optional): HOW it enables decisions or actions
6. Uses executive-level language suitable for dashboards and reports
7. Does NOT mention technical implementation details like "try_cast", "nullif", or SQL syntax
8. DOES use business terms like: revenue, cost, efficiency, risk, opportunity, performance, quality, productivity, conversion, retention, growth, profitability, satisfaction

TONE: Strategic, actionable, decision-focused (not just descriptive)

Example style for different measure types:

COUNT measure (Volume):
"Total count of properties currently under contract with buyers in the pending sale phase. This metric represents the near-term revenue pipeline and indicates the volume of deals requiring active management to ensure successful closing. Managers use this to allocate resources and forecast quarterly closings."

SUM measure (Financial):
"Aggregate gross sale price across all properties under contract, representing the total revenue pipeline that will be realized upon successful closing of all pending transactions. This forward-looking revenue indicator enables accurate revenue forecasting and helps leadership assess whether pipeline is sufficient to meet quarterly targets and plan resource needs."

AVG measure (Benchmarking):
"Average agreed-upon sale price across all properties under contract, indicating typical revenue per pending transaction. This benchmarking metric reveals pricing trends and market positioning, enabling pricing strategy optimization and competitive analysis to maximize deal value."

CALCULATED measure (Efficiency/Performance):
"Average net profit margin percentage across pending sales, measuring overall deal quality and profitability efficiency. A declining margin signals potential issues with acquisition costs, renovation spending, or market pricing, prompting corrective actions in cost management or pricing strategy to protect profitability."

TIME-BASED measure (Process/Velocity):
"Average number of days from initial listing to accepted offer across properties now under contract. This velocity metric measures market absorption speed and pricing effectiveness, identifying slow-moving properties that may need price adjustments or enhanced marketing to prevent carrying costs from eroding profitability."

CONDITIONAL measure (Risk/Quality):
"Count of pending sales that have passed the contingency deadline and are now non-contingent, representing high-probability closings with significantly reduced fall-through risk. This leading indicator of near-term revenue helps finance teams improve cash flow forecasting and enables proactive pipeline management to identify deals requiring attention."

SEGMENTATION measure (Strategic Focus):
"Count of high-value properties (above $500K) currently under contract, highlighting premium segment performance. This strategic metric helps prioritize sales team effort on high-margin opportunities and assess market penetration in the luxury segment, where individual deals significantly impact quarterly revenue."

Generate ONLY the description text, no additional formatting, no code, no explanation:`;
      
    } else if (action === 'suggest-measures') {
      // Suggest new measures based on dimensions
      const { tableName, tableDescription, dimensions, existingMeasures } = data;
      
      prompt = `You are a data analyst expert creating meaningful business metrics for a semantic data model using TRINO SQL.

Context:
- Table: ${tableName}
- Table Description: ${tableDescription || 'Business data table'}
- Available Dimensions: ${dimensions.map((d: { name: string; type: string; description: string }) => `${d.name} (${d.type}): ${d.description}`).join('\n  ')}
- Existing Measures: ${existingMeasures.map((m: { name: string; type: string }) => `${m.name} (${m.type})`).join(', ')}

INTELLIGENT CONTEXT DETECTION:
Analyze the table name and dimension names to detect the business domain and adapt your suggestions:

**E-commerce/Retail Indicators** (order, customer, product, price, cart, purchase):
→ Focus on: Conversion rates, cart abandonment, average order value, customer lifetime value, inventory turnover
→ Key metrics: Revenue per customer, repeat purchase rate, product affinity, discount impact

**Real Estate Indicators** (property, address, listing, price, sale, contract, buyer, seller):
→ Focus on: Days on market, price per square foot, profit margins, deal velocity, pipeline value
→ Key metrics: Absorption rate, price trends, concession analysis, closing probability

**SaaS/Subscription Indicators** (subscription, mrr, account, user, login, churn, tier):
→ Focus on: MRR, churn rate, customer lifetime, expansion revenue, engagement scores
→ Key metrics: Net retention, activation rate, time to value, usage intensity

**Financial/Banking Indicators** (transaction, account, balance, payment, credit, loan):
→ Focus on: Transaction volume, balance trends, default rates, cross-sell opportunities
→ Key metrics: Average balance, transaction frequency, product penetration, risk exposure

**Healthcare Indicators** (patient, appointment, treatment, diagnosis, provider, claim):
→ Focus on: Patient volume, wait times, treatment outcomes, utilization rates
→ Key metrics: No-show rates, average length of stay, readmission rates, cost per visit

**Manufacturing/Supply Chain Indicators** (inventory, supplier, shipment, warehouse, production):
→ Focus on: Inventory turns, lead times, defect rates, capacity utilization
→ Key metrics: On-time delivery, stock-out frequency, production efficiency, supplier performance

**HR/Workforce Indicators** (employee, department, salary, hire_date, performance, training):
→ Focus on: Headcount trends, turnover rates, time to hire, cost per hire
→ Key metrics: Retention rates, promotion velocity, span of control, compensation ratios

**Sales/CRM Indicators** (lead, opportunity, pipeline, deal, quota, territory):
→ Focus on: Pipeline coverage, win rates, sales velocity, quota attainment
→ Key metrics: Lead conversion, average deal size, sales cycle length, rep productivity

Based on detected domain, prioritize relevant measure types and use domain-appropriate terminology.

IMPORTANT - Use TRINO SQL Syntax for LENS MEASURES:

✅ SUPPORTED in Lens Measures:
- Aggregation functions: COUNT(), SUM(), AVG(), MIN(), MAX(), COUNT(DISTINCT)
- Type conversion: try_cast(column as double), try_cast(column as date)
- Null handling: nullif(column, ''), coalesce(column, 0)
- Date functions: date_diff('day', start_date, end_date), date_trunc('day', date_column)
- Conditional logic: case when condition then value else other end
- Math operations: +, -, *, /, %
- Comparison: =, !=, <, >, <=, >=, BETWEEN, IN
- String functions: lower(), upper(), concat(), substring()
- Nested aggregations: sum(amount) / nullif(count(*), 0)

❌ NOT SUPPORTED in Lens Measures (Query-level only):
- Window functions: OVER(), PARTITION BY, ROW_NUMBER(), RANK(), LAG(), LEAD()
- Subqueries: (SELECT ... FROM ...), IN (SELECT ...), EXISTS (SELECT ...)
- Correlated subqueries: WHERE column IN (SELECT ...)
- HAVING clauses with GROUP BY in subqueries
- ROWS BETWEEN, RANGE BETWEEN
- Analytical functions requiring window context
- Period-over-period comparisons using OVER()
- Running totals using window functions
- Moving averages using ROWS BETWEEN
- CTEs (WITH clauses)
- JOIN statements (use Lens joins instead)

For period-over-period or trending analysis, use simple aggregations that can be calculated at query time with filters.

INSTEAD OF WINDOW FUNCTIONS, USE THESE PATTERNS:

❌ DON'T: sum(amount) over (partition by month order by date rows between 1 preceding and current row)
✅ DO: sum(try_cast(nullif(amount, '') as double))
→ Apply time filters at query level for period comparison

❌ DON'T: row_number() over (partition by customer_id order by order_date)
✅ DO: count(*) with filters
→ Count measures with conditional logic

❌ DON'T: lag(revenue) over (order by month)
✅ DO: sum(try_cast(nullif(revenue, '') as double))
→ Create separate measures for current and prior periods

❌ DON'T: avg(amount) over (partition by category)
✅ DO: avg(try_cast(nullif(amount, '') as double))
→ Use Lens's built-in partition/segment features

❌ DON'T: case when customer_id in (select customer_id from orders where status = 'completed' group by customer_id having count(*) > 1)
✅ DO: Use dimensions that already have the aggregated data, or create separate measure
→ If you need repeat customer detection, add a dimension with order_count at row level

❌ DON'T: where exists (select 1 from table2 where table2.id = table1.id)
✅ DO: Use Lens joins between tables
→ Define relationships in Lens schema, not in measure SQL

❌ DON'T: amount > (select avg(amount) from orders)
✅ DO: Use direct comparisons: "case when amount > 1000 then id end"
→ Use fixed thresholds or create separate average measure

GROWTH/TREND Patterns (Without Window Functions):
- Growth counts: "case when date_diff('day', created_date, current_date) <= 30 then id end"
- Recent activity: "case when date >= date_add('day', -7, current_date) then id end"
- Time buckets: "case when date_diff('day', start, current_date) between 0 and 30 then id end"
- Recency: "date_diff('day', last_activity, current_date)" with type: avg

Based on these dimensions, suggest 8-12 DIVERSE, BUSINESS-FOCUSED measures that help executives and managers make strategic decisions.

DIVERSITY REQUIREMENTS:
- Include measures from AT LEAST 5 different categories
- Mix basic measures (counts, sums) with advanced measures (ratios, conditional logic)
- Vary complexity: 3-4 simple + 3-4 intermediate + 2-4 advanced
- Cover different stakeholder needs: executives, managers, analysts, operations
- Include at least one predictive/leading indicator
- Include at least one risk/quality metric
- Include at least one efficiency/performance metric
- Avoid redundancy - each measure should provide unique insights 

THINK LIKE A BUSINESS ANALYST - What questions would stakeholders ask?
- How is performance trending?
- Where should we focus resources?
- What risks or opportunities exist?
- Are we meeting targets?
- What actions should we take?

Prioritize measures that:
1. **Answer business questions** - "How many?", "How much?", "How fast?", "How efficient?"
2. **Enable comparisons** - Averages, percentages, ratios for benchmarking
3. **Identify trends** - Time-based metrics showing speed and velocity
4. **Highlight risks** - Conditional counts for problem areas
5. **Measure efficiency** - Ratios and margins showing productivity
6. **Track performance** - KPIs that indicate health and success
7. **Support decisions** - Metrics that suggest specific actions

MEASURE CATEGORIES TO CONSIDER:
1. **Volume metrics** - Total counts, distinct counts (market size, capacity)
2. **Financial metrics** - Sums, averages of revenue/cost (profitability, exposure)
3. **Efficiency metrics** - Ratios, percentages (margins, conversion rates, utilization)
4. **Time metrics** - Duration, velocity (cycle time, throughput, delays)
5. **Quality metrics** - Conditional counts (defects, exceptions, compliance)
6. **Segmentation metrics** - Filtered measures (high-value, at-risk, priority)
7. **Comparative metrics** - Period-over-period changes, benchmarking
8. **Distribution metrics** - Min/max for ranges, spread, outliers
9. **Composite KPIs** - Multi-dimensional performance indicators
10. **Predictive metrics** - Leading indicators, trend signals

ADVANCED MEASURE PATTERNS (Use when appropriate):

**Multi-Condition Segmentation:**
"sql": "case when amount > 1000 and status = 'active' then customer_id end"
Use for: Premium active customers, high-risk accounts, priority segments

**Weighted Averages:**
"sql": "(sum(try_cast(nullif(value, '') as double) * try_cast(nullif(weight, '') as double)) / nullif(sum(try_cast(nullif(weight, '') as double)), 0))"
Use for: Priority-weighted scores, importance-adjusted metrics

**Range Analysis (Min/Max):**
"sql": "try_cast(nullif(price, '') as double)" with type: min or max
Use for: Price ranges, capacity limits, performance bounds

**Recency Indicators:**
"sql": "date_diff('day', try_cast(nullif(last_activity_date, '') as date), current_date)"
Use for: Days since last order, inactive period, freshness

**Threshold-Based Counts:**
"sql": "case when date_diff('day', start, current_date) > 30 then id end"
Use for: Overdue items, aged inventory, stale leads

**Multi-Tier Segmentation:**
"sql": "case when amount > 10000 then id end" for premium tier
"sql": "case when amount between 1000 and 10000 then id end" for mid tier
Use for: Customer tiers, product categories, service levels

**Conversion Funnels:**
"sql": "(count(case when status = 'completed' then id end) / nullif(count(id), 0) * 100)"
Use for: Completion rates, success rates, yield percentages

**Health Scores (Composite):**
"sql": "case when status = 'active' and activity_count > 10 and value > 1000 then id end"
Use for: Healthy accounts, qualified leads, high-potential opportunities

**Simple Count-Based Velocity:**
"sql": "count(id)"
Use for: Total volume that can be divided by time period at query level
Note: Velocity per day is calculated at query time by dividing by time range

**Concentration Risk:**
"sql": "max(try_cast(nullif(value, '') as double))" combined with sum for percentage
Use for: Largest customer share, top product dependency, risk concentration

**Growth Indicators:**
"sql": "case when date_diff('day', created_date, current_date) <= 90 then id end"
Use for: Recent acquisitions, new launches, emerging trends

**Aging Analysis:**
"sql": "case when date_diff('day', start_date, current_date) between 30 and 60 then id end"
Use for: 30-60 day buckets, aging inventory, receivables aging

**Utilization Rates:**
"sql": "(count(case when status = 'in_use' then id end) / nullif(count(id), 0) * 100)"
Use for: Asset utilization, capacity usage, resource allocation

**Retention Cohorts:**
"sql": "case when date_diff('month', first_date, current_date) >= 12 then id end"
Use for: 12+ month customers, long-term retention, sticky users

TRINO SQL PATTERNS:
- Simple count: "sql": "*" or "sql": "customer_id"
- Count distinct: "sql": "customer_id" (type: count_distinct)
- Sum amount: "sql": "try_cast(nullif(order_amount, '') as double)"
- Average: "sql": "try_cast(nullif(price, '') as double)"
- Percentage: "sql": "(try_cast(nullif(profit, '') as double) / nullif(try_cast(nullif(revenue, '') as double), 0) * 100)"
- Days between: "sql": "date_diff('day', try_cast(nullif(start_date, '') as date), try_cast(nullif(end_date, '') as date))"
- Conditional: "sql": "case when status = 'active' then customer_id end"

TRINO SQL EXAMPLES:
- Simple count: "sql": "*" or "sql": "customer_id"
- Count distinct: "sql": "customer_id"
- Sum amount: "sql": "try_cast(nullif(order_amount, '') as double)"
- Average price: "sql": "try_cast(nullif(price, '') as double)"
- Profit margin: "sql": "(try_cast(nullif(profit, '') as double) / nullif(try_cast(nullif(revenue, '') as double), 0) * 100)"
- Days between dates: "sql": "date_diff('day', try_cast(nullif(start_date, '') as date), try_cast(nullif(end_date, '') as date))"
- Conditional count: "sql": "case when status = 'active' then customer_id end"
- Conditional sum: "sql": "case when category = 'premium' then try_cast(nullif(amount, '') as double) end"

For each measure, provide:
- name: snake_case name focused on business value (e.g., revenue_at_risk, high_value_customer_count, conversion_rate_pct)
- type: one of (count, count_distinct, sum, avg, min, max)
- sql: TRINO SQL expression using proper syntax as shown in examples above
- description: Business-focused description that includes:
  * WHAT it measures in business terms
  * WHY it matters to the business
  * WHAT decisions or actions it enables
  * Example format: "[Metric definition]. This [indicates/measures/tracks] [business impact] and [enables/supports] [specific business decision or action]."

EXAMPLE BUSINESS-FOCUSED DESCRIPTIONS:

Financial metric:
"Total pipeline value across all active opportunities, representing potential revenue that could close this quarter. This metric helps forecast revenue, allocate sales resources, and assess whether pipeline is sufficient to meet quarterly targets."

Efficiency metric:
"Average time from lead creation to first contact, measuring sales team responsiveness. A higher value indicates potential lost opportunities, enabling managers to optimize team workload and improve customer experience."

Risk metric:
"Count of high-value accounts with declining engagement, flagging customers at risk of churn. This early warning metric enables proactive outreach and retention strategies before revenue is lost."

Quality metric:
"Percentage of orders fulfilled within promised delivery time, measuring operational excellence. This customer satisfaction indicator drives decisions on inventory, staffing, and logistics optimization."

CRITICAL: Return ONLY a valid JSON array of measures, no markdown, no code blocks, no explanatory text:
[
  {
    "name": "measure_name",
    "type": "count",
    "sql": "column_name",
    "description": "Professional description..."
  }
]`;
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a senior business intelligence consultant and semantic modeling expert with deep expertise across multiple industries. You excel at:\n1. Translating data into actionable business insights\n2. Identifying key performance indicators that drive decisions\n3. Creating metrics that reveal risks, opportunities, and trends\n4. Writing executive-level descriptions that connect data to strategy\n5. Generating Trino SQL with production-grade quality\n6. Understanding industry-specific KPIs and benchmarks\n\nYour measures help executives make strategic decisions, managers optimize operations, and analysts uncover insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate AI content', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    const generatedText = result.choices[0]?.message?.content?.trim();

    if (!generatedText) {
      return NextResponse.json(
        { error: 'No content generated' },
        { status: 500 }
      );
    }

    if (action === 'suggest-measures') {
      try {
        // Clean up the response - remove markdown code blocks if present
        let cleanedText = generatedText.trim();
        
        // Remove markdown code blocks
        cleanedText = cleanedText.replace(/```json\s*/gi, '');
        cleanedText = cleanedText.replace(/```\s*/g, '');
        
        // Try to find JSON array in the response
        const jsonMatch = cleanedText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          cleanedText = jsonMatch[0];
        }
        
        // Parse JSON response for suggested measures
        const measures = JSON.parse(cleanedText);
        
        // Validate the response
        if (!Array.isArray(measures)) {
          throw new Error('Response is not an array');
        }
        
        if (measures.length === 0) {
          throw new Error('No measures generated');
        }
        
        // Validate each measure has required fields
        for (const measure of measures) {
          if (!measure.name || !measure.type || !measure.sql || !measure.description) {
            console.error('Invalid measure:', measure);
            throw new Error('Measure missing required fields');
          }
        }
        
        return NextResponse.json({ measures });
      } catch (error) {
        console.error('Failed to parse measures JSON:', error);
        console.error('Raw AI response:', generatedText.substring(0, 500));
        return NextResponse.json(
          { 
            error: 'Failed to parse AI response', 
            details: error instanceof Error ? error.message : 'Invalid JSON',
            rawText: generatedText.substring(0, 200) + '...'
          },
          { status: 500 }
        );
      }
    } else {
      // Return description text
      return NextResponse.json({ description: generatedText });
    }

  } catch (error) {
    console.error('Error in AI generation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

