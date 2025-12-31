// src/app/features/map/kitchen-map.component.ts
import {
  Component,
  inject,
  signal,
  computed,
  viewChild,
  AfterViewInit,
  HostListener,
  ElementRef,
  OnInit,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MatIconModule } from '@angular/material/icon';
import { FreshrService } from '../../core/services/freshr.service';
import { StageComponent, CoreShapeComponent, NgKonvaEventObject } from 'ng2-konva';
import { ZoneDetailPanelComponent } from '../../shared/components/zone-detail-panel.component';
import { SocialSignalsComponent } from '../../shared/components/social-signals.component';
import { AccordionPanelComponent } from '../../shared/components/accordion-panel.component';
import { ZONE_DISPLAY_NAMES } from '../../config/sensor-zone-mapping';
import { ZoneState } from '../../core/models/types';
import Konva from 'konva';
import { KafkaMetricsComponent } from '../../shared/components/kafka-metrics.component';
import gsap from 'gsap';

interface Zone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ZoneConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  zoneId: string;
}

interface TextConfig {
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  align: string;
  width: number;
}

interface BadgeConfig {
  x: number;
  y: number;
  radius: number;
  fill: string;
  visible: boolean;
}

interface BadgeTextConfig {
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  align: string;
  width: number;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

type PanelType = 'kafka' | 'social' | null;

@Component({
  selector: 'app-kitchen-map',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    MatIconModule,
    StageComponent,
    CoreShapeComponent,
    ZoneDetailPanelComponent,
    SocialSignalsComponent,
    KafkaMetricsComponent,
    AccordionPanelComponent,
  ],
  templateUrl: './kitchen-map.component.html',
  styleUrls: ['./kitchen-map.component.css'],
})
export class KitchenMapComponent implements OnInit, AfterViewInit {
  service = inject(FreshrService);

  stage = viewChild<StageComponent>('stage');
  detailPanel = viewChild<ZoneDetailPanelComponent>('detailPanel');
  zonePanel = viewChild<ElementRef<HTMLDivElement>>('zonePanel');
  incidentBadge = viewChild<ElementRef<HTMLDivElement>>('incidentBadge');

  selectedZone = signal<string | null>(null);
  zoomLevel = signal(100);
  expandedPanel = signal<PanelType>('kafka');

  private previousIncidentCount = 0;

  // Configuration
  private readonly PADDING_FACTOR = 0.1;
  private readonly MIN_ZOOM = 0.5;
  private readonly MAX_ZOOM = 3;
  private readonly ZOOM_STEP = 1.1;

  configStage = {
    width: 100,
    height: 100,
    draggable: true,
  };

  zones: Zone[] = [
    {
      id: 'zone-recv-1',
      name: ZONE_DISPLAY_NAMES['zone-recv-1'] || 'Receiving',
      x: 0.5,
      y: 19.5,
      width: 127,
      height: 115,
    },
    {
      id: 'zone-cold-1',
      name: ZONE_DISPLAY_NAMES['zone-cold-1'] || 'Cold Storage',
      x: 128.5,
      y: 19.5,
      width: 89,
      height: 115,
    },
    {
      id: 'zone-prep-1',
      name: ZONE_DISPLAY_NAMES['zone-prep-1'] || 'Prep Station',
      x: 218.5,
      y: 19.5,
      width: 71,
      height: 115,
    },
    {
      id: 'zone-cook-1',
      name: ZONE_DISPLAY_NAMES['zone-cook-1'] || 'Cook Line',
      x: 0.5,
      y: 135.5,
      width: 144,
      height: 48,
    },
    {
      id: 'zone-wash-1',
      name: ZONE_DISPLAY_NAMES['zone-wash-1'] || 'Washing',
      x: 145.5,
      y: 135.5,
      width: 144,
      height: 48,
    },
  ];

  // Computed
  totalActiveIncidents = computed(() => {
    return this.service.incidents().filter((inc) => inc.status !== 'Resolved').length;
  });

  zoneIncidentCounts = computed(() => {
    const incidents = this.service.visibleIncidents();
    const counts = new Map<string, number>();
    incidents.forEach((inc) => {
      if (inc.status === 'Resolved') return;
      const zoneId = inc.measurement?.zone_id;
      if (zoneId) {
        counts.set(zoneId, (counts.get(zoneId) || 0) + 1);
      }
    });
    return counts;
  });

  activeScenarioTitle = computed(() => this.service.activeScenario().title);

  constructor() {
    // Watch for incident count changes to trigger animations
    effect(() => {
      const currentCount = this.totalActiveIncidents();
      if (currentCount > this.previousIncidentCount) {
        this.animateNewIncident();
      }
      this.previousIncidentCount = currentCount;
    });
  }

  ngOnInit() {
    // Initial stagger animation will run after view init
  }

  ngAfterViewInit() {
    this.fitStageToContainer();
    this.runEntranceAnimations();
  }

  @HostListener('window:resize')
  onResize() {
    this.fitStageToContainer();
  }

  // ============ GSAP ANIMATIONS ============

  private runEntranceAnimations() {
    // Stagger in the three columns
    const columns = document.querySelectorAll('.h-full.flex.gap-4 > div');

    gsap.fromTo(
      columns,
      {
        opacity: 0,
        y: 30,
        scale: 0.95,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        stagger: 0.15,
        ease: 'power3.out',
      },
    );

    // Animate the legend and zoom indicator
    gsap.fromTo(
      '.absolute.bottom-4',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, delay: 0.8, stagger: 0.1, ease: 'power2.out' },
    );
  }

  private animateNewIncident() {
    const badge = this.incidentBadge()?.nativeElement;
    if (!badge) return;

    // Attention-grabbing shake + glow
    gsap
      .timeline()
      .to(badge, {
        scale: 1.2,
        duration: 0.15,
        ease: 'power2.out',
      })
      .to(badge, {
        x: -5,
        duration: 0.05,
        repeat: 5,
        yoyo: true,
        ease: 'power1.inOut',
      })
      .to(badge, {
        scale: 1,
        x: 0,
        duration: 0.2,
        ease: 'elastic.out(1, 0.5)',
      })
      .to(
        badge,
        {
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)',
          duration: 0.3,
          yoyo: true,
          repeat: 1,
        },
        '-=0.3',
      );
  }

  animateZoneSelection(zoneId: string) {
    const panel = this.zonePanel()?.nativeElement;
    if (!panel) return;

    // Highlight effect on zone panel
    gsap
      .timeline()
      .to(panel, {
        borderColor: '#3b82f6',
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.2)',
        duration: 0.2,
        ease: 'power2.out',
      })
      .to(panel, {
        borderColor: 'rgba(226, 232, 240, 0.8)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        duration: 0.4,
        delay: 0.5,
        ease: 'power2.inOut',
      });

    // Pulse the content inside
    const content = panel.querySelector('.overflow-y-auto');
    if (content) {
      gsap.fromTo(content, { opacity: 0.5 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
    }
  }

  // ============ ACCORDION PANEL MANAGEMENT ============

  setExpandedPanel(panel: PanelType, expanded: boolean) {
    if (expanded) {
      this.expandedPanel.set(panel);
    } else if (this.expandedPanel() === panel) {
      this.expandedPanel.set(null);
    }
  }

  getZoneSubtitle(): string {
    const zone = this.selectedZone();
    if (!zone) return 'Select a zone to view details';
    return ZONE_DISPLAY_NAMES[zone] || zone;
  }

  // ============ ZONE BOUNDS & STAGE FITTING ============

  private getZoneBounds(): Bounds {
    const minX = Math.min(...this.zones.map((z) => z.x));
    const minY = Math.min(...this.zones.map((z) => z.y));
    const maxX = Math.max(...this.zones.map((z) => z.x + z.width));
    const maxY = Math.max(...this.zones.map((z) => z.y + z.height));

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  fitStageToContainer() {
    const stage = this.stage()?.getStage();
    if (!stage) return;

    const container = stage.container();
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    if (containerWidth === 0 || containerHeight === 0) return;

    const bounds = this.getZoneBounds();
    const paddingX = bounds.width * this.PADDING_FACTOR;
    const paddingY = bounds.height * this.PADDING_FACTOR;

    const contentWidth = bounds.width + paddingX * 2;
    const contentHeight = bounds.height + paddingY * 2;

    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (containerWidth - contentWidth * scale) / 2 - (bounds.minX - paddingX) * scale;
    const offsetY =
      (containerHeight - contentHeight * scale) / 2 - (bounds.minY - paddingY) * scale;

    this.configStage = {
      ...this.configStage,
      width: containerWidth,
      height: containerHeight,
    };

    stage.width(containerWidth);
    stage.height(containerHeight);
    stage.scale({ x: scale, y: scale });
    stage.position({ x: offsetX, y: offsetY });
    stage.batchDraw();

    this.zoomLevel.set(Math.round(scale * 100));
  }

  resetView() {
    const stage = this.stage()?.getStage();
    if (stage) {
      // Animate reset
      gsap.to(stage.container(), {
        opacity: 0.5,
        duration: 0.15,
        yoyo: true,
        repeat: 1,
        onComplete: () => this.fitStageToContainer(),
      });
    }
  }

  // ============ ZONE CONFIGURATION ============

  getZoneState(zoneId: string): ZoneState {
    return this.service.getZoneState(zoneId);
  }

  private getZoneColors(state: ZoneState): { fill: string; stroke: string } {
    const colors: Record<ZoneState, { fill: string; stroke: string }> = {
      normal: { fill: 'rgba(34, 197, 94, 0.15)', stroke: '#22c55e' },
      'at-risk': { fill: 'rgba(234, 179, 8, 0.2)', stroke: '#eab308' },
      unsafe: { fill: 'rgba(239, 68, 68, 0.2)', stroke: '#ef4444' },
      recovering: { fill: 'rgba(59, 130, 246, 0.15)', stroke: '#3b82f6' },
    };
    return colors[state] || colors.normal;
  }

  getZoneConfig(zone: Zone): ZoneConfig {
    const state = this.getZoneState(zone.id);
    const colors = this.getZoneColors(state);
    const isSelected = this.selectedZone() === zone.id;

    return {
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: zone.height,
      fill: colors.fill,
      stroke: colors.stroke,
      strokeWidth: isSelected ? 3 : 2,
      cornerRadius: 6,
      zoneId: zone.id,
    };
  }

  getTextConfig(zone: Zone): TextConfig {
    const state = this.getZoneState(zone.id);
    const textColors: Record<ZoneState, string> = {
      normal: '#166534',
      'at-risk': '#854d0e',
      unsafe: '#991b1b',
      recovering: '#1e40af',
    };

    return {
      x: zone.x + 8,
      y: zone.y + 8,
      text: zone.name,
      fontSize: 11,
      fontFamily: 'Inter, system-ui, sans-serif',
      fill: textColors[state] || '#374151',
      align: 'left',
      width: zone.width - 16,
    };
  }

  getBadgeConfig(zone: Zone): BadgeConfig {
    const count = this.zoneIncidentCounts().get(zone.id) || 0;
    return {
      x: zone.x + zone.width - 12,
      y: zone.y + 12,
      radius: 10,
      fill: '#ef4444',
      visible: count > 0,
    };
  }

  getBadgeTextConfig(zone: Zone): BadgeTextConfig {
    const count = this.zoneIncidentCounts().get(zone.id) || 0;
    return {
      x: zone.x + zone.width - 22,
      y: zone.y + 6,
      text: count.toString(),
      fontSize: 10,
      fontFamily: 'Inter, system-ui, sans-serif',
      fill: '#ffffff',
      align: 'center',
      width: 20,
    };
  }

  // ============ EVENT HANDLERS ============

  trackZone(index: number, zone: Zone): string {
    return zone.id;
  }

  handleZoneClick(event: NgKonvaEventObject<MouseEvent>, zoneId: string) {
    this.selectedZone.set(zoneId);
    this.detailPanel()?.setZone(zoneId);
    this.animateZoneSelection(zoneId);
  }

  handleZoneMouseEnter(event: NgKonvaEventObject<MouseEvent>) {
    const shape = event.event?.target as Konva.Shape;
    if (shape) {
      // GSAP hover effect
      gsap.to(shape, {
        opacity: 0.85,
        scaleX: 1.02,
        scaleY: 1.02,
        duration: 0.2,
        ease: 'power2.out',
      });

      const stage = shape.getStage();
      if (stage) {
        stage.container().style.cursor = 'pointer';
      }
    }
  }

  handleZoneMouseLeave(event: NgKonvaEventObject<MouseEvent>) {
    const shape = event.event?.target as Konva.Shape;
    if (shape) {
      gsap.to(shape, {
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 0.2,
        ease: 'power2.out',
      });

      const stage = shape.getStage();
      if (stage) {
        stage.container().style.cursor = 'default';
      }
    }
  }

  handleWheel(event: NgKonvaEventObject<WheelEvent>) {
    const stage = this.stage()?.getStage();
    if (!stage) return;

    event.event?.evt.preventDefault();

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = event.event!.evt.deltaY > 0 ? -1 : 1;
    const newScale =
      direction > 0
        ? Math.min(oldScale * this.ZOOM_STEP, this.MAX_ZOOM)
        : Math.max(oldScale / this.ZOOM_STEP, this.MIN_ZOOM);

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    stage.batchDraw();

    this.zoomLevel.set(Math.round(newScale * 100));
  }

  handleDragStart(event: NgKonvaEventObject<MouseEvent>) {
    const stage = this.stage()?.getStage();
    if (stage) {
      stage.container().style.cursor = 'grabbing';
    }
  }

  handleDragEnd(event: NgKonvaEventObject<MouseEvent>) {
    const stage = this.stage()?.getStage();
    if (stage) {
      stage.container().style.cursor = 'default';
    }
  }

  handleClosePanel() {
    this.selectedZone.set(null);
  }
}
