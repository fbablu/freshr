import { Component, inject, signal, viewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { FreshrService } from '../../core/services/freshr.service';
import { StageComponent, CoreShapeComponent, NgKonvaEventObject } from 'ng2-konva';
import { ZoneDetailPanelComponent } from '../../shared/components/zone-detail-panel.component';
import Konva from 'konva';

interface Zone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status?: 'normal' | 'warning' | 'alert';
}

interface ZoneConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
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
  ],
  templateUrl: './kitchen-map.component.html',
  styleUrls: ['./kitchen-map.component.css'],
})
export class KitchenMapComponent implements AfterViewInit {
  service = inject(FreshrService);
  incidentCount = this.service.incidents;

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

  // Updated zones with correct IDs matching backend
  zones: Zone[] = [
    { id: 'zone-recv-1', name: 'Receiving', x: 0.5, y: 19.5, width: 127, height: 115 },
    { id: 'zone-cold-1', name: 'Cold Storage', x: 128.5, y: 19.5, width: 89, height: 115 },
    { id: 'zone-prep-1', name: 'Prep Station', x: 218.5, y: 19.5, width: 71, height: 115 },
    { id: 'zone-cook-1', name: 'Cook Line', x: 0.5, y: 135.5, width: 144, height: 48 },
    { id: 'zone-wash-1', name: 'Washing', x: 145.5, y: 135.5, width: 144, height: 48 },
  ];

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

    // Calculate scale to fit with padding
    const scaleX = containerWidth / (bounds.width * (1 + this.PADDING_FACTOR * 2));
    const scaleY = containerHeight / (bounds.height * (1 + this.PADDING_FACTOR * 2));
    const scale = Math.min(scaleX, scaleY);

    stage.scale({ x: scale, y: scale });

    // Center the content
    const offsetX = (containerWidth - bounds.width * scale) / 2 - bounds.minX * scale;
    const offsetY = (containerHeight - bounds.height * scale) / 2 - bounds.minY * scale;
    stage.position({ x: offsetX, y: offsetY });

    this.zoomLevel.set(Math.round(scale * 100));
  }

  getZoneConfig(zone: Zone): ZoneConfig {
    const zoneState = this.service.getZoneState(zone.id);
    let fillColor = '#f0fdf4'; // green-50 for normal
    let strokeColor = '#10b981'; // green-500 for normal

    switch (zoneState) {
      case 'unsafe':
        fillColor = '#fef2f2'; // red-50
        strokeColor = '#ef4444'; // red-500
        break;
      case 'at-risk':
        fillColor = '#fefce8'; // yellow-50
        strokeColor = '#eab308'; // yellow-500
        break;
      case 'recovering':
        fillColor = '#eff6ff'; // blue-50
        strokeColor = '#3b82f6'; // blue-500
        break;
      case 'normal':
        // Already set as default
        break;
    }

    // Highlight if selected
    if (this.selectedZone() === zone.id) {
      fillColor = '#dbeafe'; // blue-100
      strokeColor = '#2563eb'; // blue-600
    }

    return {
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: zone.height,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: this.selectedZone() === zone.id ? 2 : 1,
      zoneId: zone.id,
    };
  }

  getTextConfig(zone: Zone): TextConfig {
    return {
      x: zone.x,
      y: zone.y + zone.height / 2 - 6,
      text: zone.name,
      fontSize: 12,
      fontFamily: 'Helvetica',
      fill: '#0F0F0F',
      align: 'center',
      width: zone.width,
    };
  }

  handleZoneClick(event: NgKonvaEventObject<MouseEvent>, zoneId: string) {
    this.selectedZone.set(zoneId);
    this.service.selectZone(zoneId);

    // Update the detail panel
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
    if (this.selectedZone() !== (target as any).attrs.zoneId) {
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
