import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FreshrService } from '../../core/services/freshr.service';
import { LucideAngularModule } from 'lucide-angular';
import { FormsModule } from '@angular/forms';

type TabId = 'summary' | 'signals' | 'replay' | 'ai';

@Component({
  selector: 'app-context-drawer',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  template: `
    <div
      class="h-full flex flex-col bg-white border-l border-slate-200 shadow-xl"
      *ngIf="context() as ctx"
    >
      <!-- Header -->
      <div class="p-4 border-b border-slate-200 flex justify-between items-start bg-slate-50">
        <div>
          <div class="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {{ ctx.type }}
          </div>
          <h2 class="text-xl font-bold text-slate-800">{{ getTitle(ctx) }}</h2>
        </div>
        <button (click)="close()" class="text-slate-400 hover:text-slate-600">
          <lucide-icon name="x" [size]="20"></lucide-icon>
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-slate-200">
        <button
          *ngFor="let tab of tabs"
          (click)="activeTab.set(tab.id)"
          class="flex-1 py-3 text-sm font-medium border-b-2 transition-colors relative"
          [ngClass]="{
            'border-blue-500 text-blue-600': activeTab() === tab.id,
            'border-transparent text-slate-500 hover:text-slate-700': activeTab() !== tab.id,
          }"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Summary Tab -->
        <div *ngIf="activeTab() === 'summary'" class="space-y-6">
          <ng-container *ngIf="ctx.type === 'incident'; else zoneSummary">
            <!-- Incident Summary -->
            <div
              class="p-4 rounded-lg border border-red-100 bg-red-50 flex gap-4"
              *ngIf="
                ctx.data.anomaly.severity === 'critical' || ctx.data.anomaly.severity === 'high'
              "
            >
              <div class="mt-1 text-red-600">
                <lucide-icon name="alert-triangle"></lucide-icon>
              </div>
              <div>
                <h4 class="font-bold text-red-900">Required Action</h4>
                <p class="text-sm text-red-800 mt-1">{{ ctx.data.requiredAction }}</p>
              </div>
            </div>

            <div>
              <h3 class="text-sm font-semibold text-slate-500 uppercase mb-2">Details</h3>
              <div class="space-y-3 text-sm">
                <div class="flex justify-between py-2 border-b border-slate-100">
                  <span class="text-slate-500">Sensor ID</span>
                  <span class="font-mono text-slate-700">{{ ctx.data.anomaly.sensor_id }}</span>
                </div>
                <div class="flex justify-between py-2 border-b border-slate-100">
                  <span class="text-slate-500">Type</span>
                  <span class="text-slate-700">{{ ctx.data.anomaly.sensor_type }}</span>
                </div>
                <div class="flex justify-between py-2 border-b border-slate-100">
                  <span class="text-slate-500">Timestamp</span>
                  <span class="text-slate-700">{{
                    ctx.data.anomaly.timestamp | date: 'shortTime'
                  }}</span>
                </div>
                <div class="flex justify-between py-2 border-b border-slate-100">
                  <span class="text-slate-500">Score</span>
                  <span class="text-slate-700">{{ ctx.data.anomaly.score.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </ng-container>

          <ng-template #zoneSummary>
            <div class="text-center py-6">
              <div
                class="inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold border-2 mb-4"
                [ngClass]="{
                  'bg-green-50 border-green-200 text-green-700': ctx.data.state === 'normal',
                  'bg-red-50 border-red-200 text-red-700': ctx.data.state === 'unsafe',
                  'bg-yellow-50 border-yellow-200 text-yellow-700': ctx.data.state === 'at-risk',
                }"
              >
                {{ ctx.data.activeCount }}
              </div>
              <div class="text-slate-500">Active Issues in Period</div>
            </div>
          </ng-template>
        </div>

        <!-- AI Tab -->
        <div *ngIf="activeTab() === 'ai'" class="space-y-6">
          <!-- AI Blocks -->
          <div class="space-y-4">
            <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <h4
                class="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-2"
              >
                <lucide-icon name="sparkles" [size]="14"></lucide-icon> What Happened
              </h4>
              <p class="text-sm text-indigo-900 leading-relaxed">{{ getAIExplanation().what }}</p>
            </div>

            <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <h4
                class="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-2"
              >
                <lucide-icon name="info" [size]="14"></lucide-icon> Why It Matters
              </h4>
              <p class="text-sm text-indigo-900 leading-relaxed">{{ getAIExplanation().why }}</p>
            </div>

            <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <h4
                class="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-2"
              >
                <lucide-icon name="arrow-right-circle" [size]="14"></lucide-icon> Recommended Action
              </h4>
              <p class="text-sm text-indigo-900 leading-relaxed">{{ getAIExplanation().action }}</p>
            </div>
          </div>

          <button
            class="w-full py-2 border border-slate-200 rounded text-slate-500 text-xs hover:bg-slate-50 flex items-center justify-center gap-2"
          >
            <lucide-icon name="refresh-cw" [size]="12"></lucide-icon> Regenerate Analysis
          </button>
        </div>

        <!-- Replay Tab -->
        <div *ngIf="activeTab() === 'replay'">
          <div class="relative pl-4 border-l-2 border-slate-200 space-y-8 my-4">
            <div class="relative">
              <div
                class="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-slate-300 border-4 border-white"
              ></div>
              <div class="text-xs text-slate-400">10 mins ago</div>
              <div class="text-sm text-slate-600">Sensor reading normal</div>
            </div>
            <div class="relative">
              <div
                class="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-red-500 border-4 border-white shadow-sm"
              ></div>
              <div class="text-xs text-slate-400">7 mins ago</div>
              <div class="font-bold text-red-600">Anomaly Detected</div>
              <div class="text-sm bg-red-50 p-2 rounded mt-1 border border-red-100">
                Value spiked to
                {{ ctx.data?.anomaly?.severity === 'critical' ? '12.4' : '8.2' }}
              </div>
            </div>
            <div class="relative">
              <div
                class="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-white"
              ></div>
              <div class="text-xs text-slate-400">Just now</div>
              <div class="text-sm text-slate-800 font-medium">Ticket Created</div>
            </div>
          </div>

          <div class="mt-8">
            <label class="text-xs font-bold text-slate-500 uppercase">Playback</label>
            <input type="range" class="w-full mt-2" min="0" max="100" value="100" />
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ContextDrawerComponent {
  service = inject(FreshrService);
  context = this.service.selectedContext;

  activeTab = signal<TabId>('summary');

  tabs: { id: TabId; label: string }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'signals', label: 'Signals' },
    { id: 'replay', label: 'Replay' },
    { id: 'ai', label: 'AI Analysis' },
  ];

  close() {
    this.service.selectedContext.set(null);
  }

  getTitle(ctx: any) {
    if (ctx?.type === 'incident') return `Incident #${ctx.data.anomaly.id.split('-')[1]}`;
    if (ctx?.type === 'zone') return ctx.data.name;
    return '';
  }

  getAIExplanation() {
    const c = this.context();
    if (c?.type !== 'incident') return { what: 'N/A', why: 'N/A', action: 'N/A' };

    const type = c.data.anomaly.sensor_type;

    if (type === 'cold_storage_temperature') {
      return {
        what: 'Temperature spikes detected in Cold Storage Zone 1, deviating from baseline by 4.2°C over the last 15 minutes.',
        why: 'Sustained temperatures above 4°C facilitate bacterial growth (e.g., Listeria), compromising food safety compliance.',
        action:
          'Inspect door seal integrity immediately. Verify thermostat calibration. If resolved, continue monitoring for 30 mins.',
      };
    }

    return {
      what: 'Irregular patterns detected.',
      why: 'Potential safety risk.',
      action: 'Investigate.',
    };
  }
}
