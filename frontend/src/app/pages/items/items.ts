import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClaimsService, ItemsService } from '../../core/services/api.service';
import { Claim, Item, WorkflowStep } from '../../core/models/models';

const CATEGORIES = ['Travel','Accommodation','Meals','Equipment','Training','Subscriptions','Entertainment','Other'];

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './items.html',
})
export class ItemsComponent implements OnInit {
  claimId    = '';
  claim?:    Claim;
  items:     Item[]          = [];
  workflow:  WorkflowStep[]  = [];
  loading    = true;
  error      = '';
  successMsg = '';

  showItemForm  = false;
  savingItem    = false;
  itemFormError = '';
  editingItem?: Item;

  categories = CATEGORIES;

  itemForm = { category: 'Travel', amount: 0, expenseDate: '', itemDescription: '', receiptRequired: true };

  constructor(
    private route: ActivatedRoute,
    private claimsService: ClaimsService,
    private itemsService: ItemsService,
  ) {}

  ngOnInit() {
    this.claimId = this.route.snapshot.paramMap.get('id') || '';
    this.loadClaim();
  }

  loadClaim() {
    this.loading = true;
    this.claimsService.getById(this.claimId).subscribe({
      next: res => {
        this.claim    = res.claim;
        this.items    = res.items;
        this.workflow = res.workflow;
        this.loading  = false;
      },
      error: e => { this.error = e.error?.error || 'Failed to load claim.'; this.loading = false; }
    });
  }

  saveItem() {
    if (!this.itemForm.itemDescription.trim() || !this.itemForm.expenseDate || this.itemForm.amount <= 0) {
      this.itemFormError = 'Please fill in all fields with valid values.'; return;
    }
    this.savingItem = true; this.itemFormError = '';

    const obs = this.editingItem
      ? this.itemsService.update(this.claimId, this.editingItem._id, this.itemForm)
      : this.itemsService.create(this.claimId, this.itemForm);

    obs.subscribe({
      next: () => { this.successMsg = this.editingItem ? 'Item updated.' : 'Item added.'; this.savingItem = false; this.cancelItemForm(); this.loadClaim(); },
      error: e => { this.itemFormError = e.error?.error || 'Failed to save item.'; this.savingItem = false; }
    });
  }

  editItem(item: Item) {
    this.editingItem = item;
    this.itemForm = {
      category:        item.category,
      amount:          item.amount,
      expenseDate:     item.expenseDate?.substring(0, 10),
      itemDescription: item.itemDescription,
      receiptRequired: item.receiptRequired,
    };
    this.showItemForm = true;
  }

  deleteItem(item: Item) {
    if (!confirm('Delete this item?')) return;
    this.itemsService.delete(this.claimId, item._id).subscribe({
      next:  () => { this.successMsg = 'Item deleted.'; this.loadClaim(); },
      error: e => { this.error = e.error?.error || 'Failed to delete item.'; }
    });
  }

  cancelItemForm() {
    this.showItemForm = false; this.editingItem = undefined; this.itemFormError = '';
    this.itemForm = { category: 'Travel', amount: 0, expenseDate: '', itemDescription: '', receiptRequired: true };
  }

  getApproverName(w: WorkflowStep) {
    const a = w.approverId as any;
    return typeof a === 'object' ? `${a.firstName} ${a.lastName}` : '—';
  }

  getBadge(status: string) {
    const map: Record<string, string> = { 'Draft': 'badge badge-draft', 'Submitted': 'badge badge-submitted', 'Under Review': 'badge badge-review', 'Approved': 'badge badge-approved', 'Rejected': 'badge badge-rejected' };
    return map[status] || 'badge';
  }

  getDecisionBadge(d: string) {
    return d === 'Approved' ? 'badge badge-approved' : d === 'Rejected' ? 'badge badge-rejected' : 'badge badge-pending';
  }
}
