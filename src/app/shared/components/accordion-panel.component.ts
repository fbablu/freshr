// src/app/shared/components/accordion-panel.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import gsap from 'gsap';

@Component({
  selector: 'app-accordion-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div
      class="accordion-panel rounded-xl border border-slate-200 overflow-hidden transition-shadow duration-300"
      [class.shadow-lg]="expanded"
      [class.shadow-sm]="!expanded"
      [class.ring-2]="expanded"
      [class.ring-blue-500/20]="expanded"
    >
      <!-- Header (always visible) -->
      <button
        (click)="toggle()"
        class="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r transition-all duration-300"
        [ngClass]="{
          'from-slate-50 to-white': !expanded,
          'from-blue-50 to-white': expanded
        }"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300"
            [ngClass]="{
              'bg-slate-100 text-slate-600': !expanded,
              'bg-blue-100 text-blue-600': expanded
            }"
          >
            <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">{{ icon }}</mat-icon>
          </div>
          <div class="text-left">
            <h3 class="font-semibold text-slate-900 text-sm">{{ title }}</h3>
            <p class="text-xs text-slate-500" *ngIf="subtitle && !expanded">{{ subtitle }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Badge (optional) -->
          <span
            *ngIf="badgeCount > 0"
            class="px-2 py-0.5 text-xs font-medium rounded-full transition-colors duration-300"
            [ngClass]="{
              'bg-red-100 text-red-700': badgeType === 'danger',
              'bg-yellow-100 text-yellow-700': badgeType === 'warning',
              'bg-green-100 text-green-700': badgeType === 'success',
              'bg-blue-100 text-blue-700': badgeType === 'info'
            }"
          >
            {{ badgeCount }}
          </span>

          <!-- Expand/Collapse Icon -->
          <div
            #chevronIcon
            class="w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-200"
            [class.bg-slate-100]="!expanded"
            [class.bg-blue-100]="expanded"
          >
            <mat-icon
              class="!text-[16px] !w-4 !h-4 transition-transform duration-300"
              [class.text-slate-500]="!expanded"
              [class.text-blue-600]="expanded"
            >
              expand_more
            </mat-icon>
          </div>
        </div>
      </button>

      <!-- Peek Preview (collapsed state) -->
      <div
        #peekContent
        class="peek-content overflow-hidden"
        [class.hidden]="expanded"
      >
        <ng-content select="[peek]"></ng-content>
      </div>

      <!-- Expanded Content -->
      <div #expandedContent class="expanded-content overflow-hidden">
        <div class="border-t border-slate-100">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .accordion-panel {
        will-change: transform, box-shadow;
      }

      .peek-content {
        max-height: 60px;
      }
    `,
  ],
})
export class AccordionPanelComponent implements AfterViewInit, OnChanges {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon = 'info';
  @Input() expanded = false;
  @Input() badgeCount = 0;
  @Input() badgeType: 'danger' | 'warning' | 'success' | 'info' = 'info';

  @Output() expandedChange = new EventEmitter<boolean>();

  @ViewChild('expandedContent') expandedContent!: ElementRef<HTMLDivElement>;
  @ViewChild('peekContent') peekContent!: ElementRef<HTMLDivElement>;
  @ViewChild('chevronIcon') chevronIcon!: ElementRef<HTMLDivElement>;

  private isAnimating = false;
  private initialized = false;

  ngAfterViewInit() {
    // Set initial state without animation
    if (!this.expanded) {
      gsap.set(this.expandedContent.nativeElement, { height: 0, opacity: 0 });
      gsap.set(this.chevronIcon.nativeElement.querySelector('mat-icon'), { rotation: 0 });
    } else {
      gsap.set(this.expandedContent.nativeElement, { height: 'auto', opacity: 1 });
      gsap.set(this.chevronIcon.nativeElement.querySelector('mat-icon'), { rotation: 180 });
      gsap.set(this.peekContent?.nativeElement, { height: 0, opacity: 0 });
    }
    this.initialized = true;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['expanded'] && this.initialized && !changes['expanded'].firstChange) {
      this.animateState(this.expanded);
    }
  }

  toggle() {
    if (this.isAnimating) return;
    this.expandedChange.emit(!this.expanded);
  }

  private animateState(expand: boolean) {
    if (!this.expandedContent?.nativeElement) return;

    this.isAnimating = true;
    const content = this.expandedContent.nativeElement;
    const peek = this.peekContent?.nativeElement;
    const chevron = this.chevronIcon.nativeElement.querySelector('mat-icon');

    const tl = gsap.timeline({
      onComplete: () => {
        this.isAnimating = false;
      },
    });

    if (expand) {
      // Expanding
      tl.to(
        chevron,
        {
          rotation: 180,
          duration: 0.3,
          ease: 'power2.out',
        },
        0,
      );

      if (peek) {
        tl.to(
          peek,
          {
            height: 0,
            opacity: 0,
            duration: 0.2,
            ease: 'power2.in',
          },
          0,
        );
      }

      // Get natural height
      gsap.set(content, { height: 'auto' });
      const naturalHeight = content.offsetHeight;
      gsap.set(content, { height: 0 });

      tl.to(
        content,
        {
          height: naturalHeight,
          opacity: 1,
          duration: 0.35,
          ease: 'power3.out',
        },
        0.1,
      );

      // Reset to auto after animation
      tl.set(content, { height: 'auto' });
    } else {
      // Collapsing
      tl.to(
        chevron,
        {
          rotation: 0,
          duration: 0.3,
          ease: 'power2.out',
        },
        0,
      );

      tl.to(
        content,
        {
          height: 0,
          opacity: 0,
          duration: 0.25,
          ease: 'power2.in',
        },
        0,
      );

      if (peek) {
        tl.to(
          peek,
          {
            height: 60,
            opacity: 1,
            duration: 0.2,
            ease: 'power2.out',
          },
          0.15,
        );
      }
    }
  }
}
