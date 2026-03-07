'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Plus } from 'lucide-react';

interface PromptsFiltersProps {
  onSearchChange?: (search: string) => void;
  onCategoryChange?: (category: string) => void;
  onStatusChange?: (status: string) => void;
  onCreateNew?: () => void;
}

export default function PromptsFilters({
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  onCreateNew,
}: PromptsFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onSearchChange?.(value);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    onCategoryChange?.(value);
    updateActiveFilters('category', value);
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    onStatusChange?.(value);
    updateActiveFilters('status', value);
  };

  const updateActiveFilters = (type: string, value: string) => {
    const newFilters = activeFilters.filter(f => !f.startsWith(type));
    if (value !== 'all') {
      newFilters.push(`${type}:${value}`);
    }
    setActiveFilters(newFilters);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setActiveFilters([]);
    onSearchChange?.('');
    onCategoryChange?.('all');
    onStatusChange?.('all');
  };

  const removeFilter = (filter: string) => {
    const [type, value] = filter.split(':');
    if (type === 'category') {
      handleCategoryChange('all');
    } else if (type === 'status') {
      handleStatusChange('all');
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          {/* Search and Create Button */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search templates by name or description..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={onCreateNew} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="follow_up">Follow Up</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {activeFilters.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((filter) => {
                  const [type, value] = filter.split(':');
                  return (
                    <Badge
                      key={filter}
                      variant="secondary"
                      className="flex items-center space-x-1"
                    >
                      <span className="capitalize">
                        {type}: {value.replace('_', ' ')}
                      </span>
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeFilter(filter)}
                      />
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}