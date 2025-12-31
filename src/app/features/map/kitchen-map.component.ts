// src/app/features/map/kitchen-map.component.ts
import {
  Component,
  inject,
  signal,
  computed,
  viewChild,
  AfterViewInit,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { FreshrService } from '../../core/services/freshr.service';
import { StageComponent, CoreShapeComponent, NgKonvaEventObject } from 'ng2-konva';
import { ZoneDetailPanelComponent } from '../../shared/components/zone-detail-panel.component';
import { SocialSignalsComponent } from '../../shared/components/social-signals.component';
import { DemoControlsComponent } from '../../shared/components/demo-controls.component';
import { ZONE_DISPLAY_NAMES } from '../../config/sensor-zone-mapping';
import { ZoneState } from '../../core/models/types';
import Konva from 'konva';

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
  visible: boolean;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-kitchen-map',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    StageComponent,
    CoreShapeComponent,
    ZoneDetailPanelComponent,
    SocialSignalsComponent,
    DemoControlsComponent,
  ],
  templateUrl: './kitchen-map.component.html',
  styleUrls: ['./kitchen-map.component.css'],
})
export class KitchenMapComponent implements AfterViewInit {
  service = inject(FreshrService);

  stage = viewChild<StageComponent>('stage');
  detailPanel = viewChild<ZoneDetailPanelComponent>('detailPanel');

  selectedZone = signal<string | null>(null);
  zoomLevel = signal(100);

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

  // Zones with IDs matching backend + proper display names
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

  // Computed: Total active incidents count
  totalActiveIncidents = computed(() => {
    return this.service.incidents().filter((inc) => inc.status !== 'Resolved').length;
  });

  // Computed: Zone incident counts for badges
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

  // Computed: Active scenario info
  activeScenarioTitle = computed(() => this.service.activeScenario().title);

  ngAfterViewInit() {
    this.fitStageToContainer();
  }

  @HostListener('window:resize')
  onResize() {
    this.fitStageToContainer();
  }

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

    const container = stage.container().parentElement;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    stage.width(containerWidth);
    stage.height(containerHeight);

    const bounds = this.getZoneBounds();

    // Calculate scale to fit zones with padding
    const scaleX = (containerWidth * (1 - this.PADDING_FACTOR * 2)) / bounds.width;
    const scaleY = (containerHeight * (1 - this.PADDING_FACTOR * 2)) / bounds.height;
    const scale = Math.min(scaleX, scaleY, this.MAX_ZOOM);

    // Center the zones
    const offsetX = (containerWidth - bounds.width * scale) / 2 - bounds.minX * scale;
    const offsetY = (containerHeight - bounds.height * scale) / 2 - bounds.minY * scale;

    stage.scale({ x: scale, y: scale });
    stage.position({ x: offsetX, y: offsetY });
    this.zoomLevel.set(Math.round(scale * 100));
  }

  // Zone styling based on state
  getZoneConfig(zone: Zone): ZoneConfig {
    const state = this.service.getZoneState(zone.id);
    const isSelected = this.selectedZone() === zone.id;

    const colors: Record<ZoneState, { fill: string; stroke: string }> = {
      normal: { fill: '#f0fdf4', stroke: '#22c55e' },
      'at-risk': { fill: '#fefce8', stroke: '#eab308' },
      unsafe: { fill: '#fef2f2', stroke: '#ef4444' },
      recovering: { fill: '#eff6ff', stroke: '#3b82f6' },
    };

    const { fill, stroke } = colors[state] || colors.normal;

    return {
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: zone.height,
      fill,
      stroke,
      strokeWidth: isSelected ? 2 : 1,
      cornerRadius: 4,
      zoneId: zone.id,
    };
  }

  // Zone label
  getTextConfig(zone: Zone): TextConfig {
    return {
      x: zone.x + 8,
      y: zone.y + 8,
      text: zone.name,
      fontSize: 11,
      fontFamily: 'Inter, Helvetica, sans-serif',
      fill: '#334155',
      align: 'left',
      width: zone.width - 16,
    };
  }

  // Badge circle for incident count
  getBadgeConfig(zone: Zone): BadgeConfig {
    const count = this.zoneIncidentCounts().get(zone.id) || 0;
    return {
      x: zone.x + zone.width - 10,
      y: zone.y + 10,
      radius: 8,
      fill: count > 0 ? '#ef4444' : 'transparent',
      visible: count > 0,
    };
  }

  // Badge text (number)
  getBadgeTextConfig(zone: Zone): BadgeTextConfig {
    const count = this.zoneIncidentCounts().get(zone.id) || 0;
    return {
      x: zone.x + zone.width - 18,
      y: zone.y + 5,
      text: count.toString(),
      fontSize: 10,
      fontFamily: 'Inter, Helvetica, sans-serif',
      fill: '#ffffff',
      align: 'center',
      width: 16,
      visible: count > 0,
    };
  }

  handleZoneClick(event: NgKonvaEventObject<MouseEvent>, zoneId: string) {
    this.selectedZone.set(zoneId);
    this.service.selectZone(zoneId);

    const panel = this.detailPanel();
    if (panel) {
      panel.setZone(zoneId);
    }
  }

  handleZoneMouseEnter(event: NgKonvaEventObject<MouseEvent>) {
    const stage = this.stage()?.getStage();
    if (stage) {
      stage.container().style.cursor = 'pointer';
    }
    const target = event.event.target as Konva.Rect;
    target.strokeWidth(2);
  }

  handleZoneMouseLeave(event: NgKonvaEventObject<MouseEvent>) {
    const stage = this.stage()?.getStage();
    if (stage) {
      stage.container().style.cursor = 'grab';
    }
    const target = event.event.target as Konva.Rect;
    const zoneId = (target as any).attrs?.zoneId;
    if (this.selectedZone() !== zoneId) {
      target.strokeWidth(1);
    }
  }

  handleWheel(event: NgKonvaEventObject<WheelEvent>) {
    event.event.evt.preventDefault();

    const stage = this.stage()?.getStage();
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = event.event.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * this.ZOOM_STEP : oldScale / this.ZOOM_STEP;
    const clampedScale = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, newScale));

    stage.scale({ x: clampedScale, y: clampedScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    stage.position(newPos);
    this.zoomLevel.set(Math.round(clampedScale * 100));
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
      stage.container().style.cursor = 'grab';
    }
  }

  resetView() {
    this.fitStageToContainer();
  }

  trackZone(index: number, zone: Zone): string {
    return zone.id;
  }

  handleClosePanel() {
    this.selectedZone.set(null);
    this.service.clearSelection();
  }
}
