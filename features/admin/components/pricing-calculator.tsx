'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calculator,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PreviewCalculation {
  laborHours: number;
  productionItems: { [key: string]: number };
  laborCost: number;
  productionCost: number;
  subtotal: number;
  tax: number;
  total: number;
}

interface PricingCalculatorProps {
  productionRates: { [key: string]: number };
  laborRate: number;
}

export default function PricingCalculator({
  productionRates,
  laborRate,
}: PricingCalculatorProps) {
  // Preview calculator state
  const [previewLaborHours, setPreviewLaborHours] = useState(5);
  const [previewItems, setPreviewItems] = useState<{ [key: string]: number }>({
    business_cards: 1000,
    flyers: 500,
    brochures: 100,
  });
  const [taxRate, setTaxRate] = useState(8.5);

  const updatePreviewItem = (item: string, quantity: number) => {
    setPreviewItems((prev) => ({
      ...prev,
      [item]: quantity,
    }));
  };

  const removePreviewItem = (item: string) => {
    setPreviewItems((prev) => {
      const newItems = { ...prev };
      delete newItems[item];
      return newItems;
    });
  };

  const calculatePreview = (): PreviewCalculation => {
    const laborCost = previewLaborHours * laborRate;

    const productionCost = Object.entries(previewItems).reduce(
      (total, [item, quantity]) => {
        const rate = productionRates[item] || 0;
        return total + quantity * rate;
      },
      0
    );

    const subtotal = laborCost + productionCost;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    return {
      laborHours: previewLaborHours,
      productionItems: previewItems,
      laborCost,
      productionCost,
      subtotal,
      tax,
      total,
    };
  };

  const previewCalc = calculatePreview();

  return (
    <Tabs defaultValue="calculator" className="space-y-6">
      <TabsList>
        <TabsTrigger value="calculator">
          <Calculator className="mr-2 h-4 w-4" />
          Preview Calculator
        </TabsTrigger>
      </TabsList>

      <TabsContent value="calculator" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calculator Input */}
          <Card>
            <CardHeader>
              <CardTitle>Preview Calculator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Labor Hours */}
              <div className="space-y-2">
                <Label htmlFor="preview-hours">Labor Hours</Label>
                <Input
                  id="preview-hours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={previewLaborHours}
                  onChange={(e) =>
                    setPreviewLaborHours(parseFloat(e.target.value) || 0)
                  }
                />
              </div>

              <Separator />

              {/* Production Items */}
              <div className="space-y-4">
                <Label>Production Items</Label>
                {Object.entries(previewItems).map(([item, quantity]) => (
                  <div key={item} className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-sm">
                        {item
                          .replace('_', ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Label>
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={(e) =>
                          updatePreviewItem(
                            item,
                            parseInt(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div className="w-20 text-sm text-muted-foreground">
                      @ {formatCurrency(productionRates[item] || 0)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removePreviewItem(item)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newItem = prompt(
                      'Enter item name (use underscores for spaces):'
                    );
                    if (newItem && !previewItems[newItem]) {
                      updatePreviewItem(newItem, 0);
                    }
                  }}
                >
                  Add Item
                </Button>
              </div>

              <Separator />

              {/* Tax Rate */}
              <div className="space-y-2">
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) =>
                    setTaxRate(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Calculator Results */}
          <Card>
            <CardHeader>
              <CardTitle>Calculation Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Labor Cost:</span>
                  <span className="font-medium">
                    {previewCalc.laborHours}h × {formatCurrency(laborRate)} ={' '}
                    {formatCurrency(previewCalc.laborCost)}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Production Cost:</span>
                    <span className="font-medium">
                      {formatCurrency(previewCalc.productionCost)}
                    </span>
                  </div>
                  {Object.entries(previewCalc.productionItems).map(
                    ([item, quantity]) => {
                      if (quantity === 0) return null;
                      const rate = productionRates[item] || 0;
                      const cost = quantity * rate;
                      return (
                        <div
                          key={item}
                          className="flex justify-between items-center text-xs text-muted-foreground ml-4"
                        >
                          <span>
                            {item.replace('_', ' ')}: {quantity} ×{' '}
                            {formatCurrency(rate)}
                          </span>
                          <span>{formatCurrency(cost)}</span>
                        </div>
                      );
                    }
                  )}
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="text-sm">Subtotal:</span>
                  <span className="font-medium">
                    {formatCurrency(previewCalc.subtotal)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">Tax ({taxRate}%):</span>
                  <span className="font-medium">
                    {formatCurrency(previewCalc.tax)}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">
                    {formatCurrency(previewCalc.total)}
                  </span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Preview Only</p>
                    <p>
                      This calculation is for preview purposes. Actual
                      proposal calculations may include additional factors
                      like discounts, rush fees, or custom pricing.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}