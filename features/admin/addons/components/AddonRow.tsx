'use client';

/**
 * AddonRow Component
 * Single row in the add-ons table with action buttons
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Power, 
  Eye, 
  EyeOff,
  AlertTriangle 
} from 'lucide-react';
import { toast } from 'sonner';
import type { Addon } from '../types';
import { formatPricing, formatFrequency } from '../utils/formatters';
import { CATEGORY_LABELS } from '../types';
import { TableCell, TableRow } from '@/components/ui/table';

interface AddonRowProps {
  addon: Addon;
  onEdit: (addon: Addon) => void;
  onDelete: (id: string, soft: boolean) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onToggleShowInProposals: (id: string, show: boolean) => Promise<void>;
}

export function AddonRow({
  addon,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleShowInProposals,
}: AddonRowProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Optimistic UI state
  const [optimisticActive, setOptimisticActive] = useState(addon.active);
  const [optimisticShowInProposals, setOptimisticShowInProposals] = useState(addon.show_in_proposals ?? true);

  // Update optimistic state when addon prop changes (after backend sync)
  useEffect(() => {
    setOptimisticActive(addon.active);
    setOptimisticShowInProposals(addon.show_in_proposals ?? true);
  }, [addon.active, addon.show_in_proposals]);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(addon.id, deleteType === 'soft');
      setShowDeleteDialog(false);
    } catch (error) {
      // Error already toasted in parent
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (checked: boolean) => {
    // Optimistic update - change UI immediately
    setOptimisticActive(checked);
    
    try {
      await onToggleActive(addon.id, checked);
      // Backend succeeded, optimistic state will sync via useEffect
    } catch (error) {
      // Backend failed, revert optimistic update
      setOptimisticActive(!checked);
      toast.error('Failed to update active status');
    }
  };

  const handleToggleShowInProposals = async (checked: boolean) => {
    // Optimistic update - change UI immediately
    setOptimisticShowInProposals(checked);
    
    try {
      await onToggleShowInProposals(addon.id, checked);
      // Backend succeeded, optimistic state will sync via useEffect
    } catch (error) {
      // Backend failed, revert optimistic update
      setOptimisticShowInProposals(!checked);
      toast.error('Failed to update proposal visibility');
    }
  };

  return (
    <>
      <TableRow className={!optimisticActive ? 'opacity-60' : ''}>
        <TableCell className="font-medium">
          <div>
            <div className="font-semibold">{addon.label}</div>
            <div className="text-xs text-muted-foreground">{addon.sku}</div>
          </div>
        </TableCell>
        
        <TableCell>
          {addon.category && (
            <Badge variant="outline">{CATEGORY_LABELS[addon.category]}</Badge>
          )}
        </TableCell>

        <TableCell className="text-sm">
          {formatPricing(addon.rate, addon.unit_type)}
          {addon.min_qty > 0 && (
            <div className="text-xs text-muted-foreground">
              Min: {addon.min_qty}
            </div>
          )}
        </TableCell>

        <TableCell className="text-sm">
          {formatFrequency(addon.default_frequency)}
        </TableCell>

        <TableCell>
          <Switch
            checked={optimisticActive}
            onCheckedChange={handleToggleActive}
            aria-label="Toggle active status"
          />
        </TableCell>

        <TableCell>
          <Switch
            checked={optimisticShowInProposals}
            onCheckedChange={handleToggleShowInProposals}
            aria-label="Toggle show in proposals"
          />
        </TableCell>

        <TableCell>
          <Badge variant={addon.amortize_to_monthly ? 'default' : 'secondary'}>
            {addon.amortize_to_monthly ? 'Yes' : 'No'}
          </Badge>
        </TableCell>

        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(addon)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleToggleActive(!addon.active)}>
                <Power className="mr-2 h-4 w-4" />
                {addon.active ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={() => handleToggleShowInProposals(!addon.show_in_proposals)}
              >
                {addon.show_in_proposals ? (
                  <EyeOff className="mr-2 h-4 w-4" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                {addon.show_in_proposals ? 'Hide from Proposals' : 'Show in Proposals'}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => {
                  setDeleteType('soft');
                  setShowDeleteDialog(true);
                }}
                className="text-orange-600"
              >
                <Power className="mr-2 h-4 w-4" />
                Soft Delete (Deactivate)
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  setDeleteType('hard');
                  setShowDeleteDialog(true);
                }}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Permanent Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              {deleteType === 'soft' ? 'Deactivate Add-On?' : 'Permanently Delete Add-On?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'soft' ? (
                <>
                  This will deactivate <strong>{addon.label}</strong>. It will no longer appear 
                  in the catalog but can be reactivated later. Existing proposals using this 
                  add-on will not be affected.
                </>
              ) : (
                <>
                  This will <strong className="text-red-600">permanently delete</strong>{' '}
                  <strong>{addon.label}</strong>. This action cannot be undone. 
                  <br /><br />
                  <strong className="text-red-600">Warning:</strong> This may affect existing 
                  proposals that reference this add-on.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className={deleteType === 'hard' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isDeleting ? 'Processing...' : deleteType === 'soft' ? 'Deactivate' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

