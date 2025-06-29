# UI Components

This directory contains reusable UI components that provide consistent styling and behavior across the NIMBUS application.

## Components

### StatCard

A card component for displaying key metrics and statistics with optional trend indicators.

```tsx
import { StatCard } from '../components/ui';

<StatCard
  title="Total Revenue"
  value="$125,000"
  icon={DollarSign}
  trend="+12.5%"
  trendDirection="positive"
  color="emerald"
  onClick={() => handleClick()}
/>
```

**Props:**
- `title`: The card title
- `value`: The main value to display
- `icon`: Lucide React icon component
- `trend` (optional): Trend percentage or text
- `trendDirection` (optional): 'positive' | 'negative' | 'neutral'
- `color` (optional): Color theme - 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'blue' | 'green' | 'yellow' | 'purple' | 'cyan'
- `onClick` (optional): Click handler
- `className` (optional): Additional CSS classes

### Card

A versatile container component for content sections with optional header and actions.

```tsx
import { Card } from '../components/ui';

<Card
  title="Section Title"
  icon={BarChart}
  action={<button>Action</button>}
  padding="md"
  className="mb-6"
>
  <div>Card content goes here</div>
</Card>
```

**Props:**
- `children`: Required content
- `title` (optional): Section title
- `icon` (optional): Lucide React icon component
- `action` (optional): Action element (button, select, etc.)
- `padding` (optional): 'sm' | 'md' | 'lg' (default: 'md')
- `className` (optional): Additional CSS classes

### Alert

A notification component for displaying alerts, warnings, and informational messages.

```tsx
import { Alert } from '../components/ui';

<Alert
  type="warning"
  title="Low Stock Alert"
  onClose={() => handleClose()}
>
  Product inventory is running low.
</Alert>
```

**Props:**
- `children`: Alert message content
- `type` (optional): 'success' | 'error' | 'warning' | 'info' (default: 'info')
- `title` (optional): Alert title
- `onClose` (optional): Close handler
- `className` (optional): Additional CSS classes

## Usage Guidelines

1. **Consistent Styling**: All components use the same color scheme and design patterns
2. **Responsive Design**: Components are responsive and work on all screen sizes
3. **Accessibility**: Components include proper ARIA attributes and keyboard navigation
4. **TypeScript**: All components are fully typed for better development experience

## Color Themes

The components support consistent color themes that match the application's design:

- **Indigo**: Primary actions and main metrics
- **Emerald**: Success states and positive trends
- **Amber**: Warning states and medium priority
- **Rose**: Error states and critical alerts
- **Violet**: Secondary actions and categories
- **Blue**: Information and neutral states
- **Green**: Financial and growth metrics
- **Yellow**: Caution and attention states
- **Purple**: Premium features and special content
- **Cyan**: Technical and data-related content

## Examples

### Dashboard Stat Cards
```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <StatCard
    title="Total Products"
    value={totalProducts}
    icon={Package}
    color="indigo"
  />
  <StatCard
    title="Revenue"
    value={`$${revenue.toLocaleString()}`}
    icon={DollarSign}
    trend="+15.2%"
    trendDirection="positive"
    color="emerald"
  />
</div>
```

### Content Sections
```tsx
<Card title="Analytics Overview" icon={BarChart}>
  <div className="h-64">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        {/* Chart content */}
      </LineChart>
    </ResponsiveContainer>
  </div>
</Card>
```

### Alert Messages
```tsx
<Alert type="warning" title="Low Stock Alert">
  The following products are running low on inventory:
  <ul className="mt-2 list-disc list-inside">
    <li>Laptop Pro X (5 remaining)</li>
    <li>Wireless Earbuds (12 remaining)</li>
  </ul>
</Alert>
``` 