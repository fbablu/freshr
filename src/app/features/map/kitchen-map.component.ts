// kitchen-map.component.ts
import { Component, inject, signal, viewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { FreshrService } from '../../core/services/freshr.service';
import { StageComponent, CoreShapeComponent, NgKonvaEventObject } from 'ng2-konva';
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
  imports: [CommonModule, LucideAngularModule, StageComponent, CoreShapeComponent],
  templateUrl: './kitchen-map.component.html',
  styleUrls: ['./kitchen-map.component.css'],
})
export class KitchenMapComponent implements AfterViewInit {
  service = inject(FreshrService);
  incidentCount = this.service.incidents;

  stage = viewChild<StageComponent>('stage');

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

  zones: Zone[] = [
    { id: 'washing', name: 'Washing', x: 0.5, y: 19.5, width: 127, height: 115 },
    { id: 'food prep', name: 'Food Prep', x: 128.5, y: 19.5, width: 89, height: 115 },
    { id: 'output', name: 'Output', x: 218.5, y: 19.5, width: 71, height: 115 },
    { id: 'assembly', name: 'Assembly', x: 0.5, y: 135.5, width: 144, height: 48 },
    { id: 'storage', name: 'Storage', x: 145.5, y: 135.5, width: 144, height: 48 },
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
    return {
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: zone.height,
      fill: this.selectedZone() === zone.id ? '#dbeafe' : 'white',
      stroke: 'black',
      strokeWidth: 1,
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
    console.log('Zone clicked:', zoneId);
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
    target.strokeWidth(1);
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

  updateScenario(e: Event) {
    const target = e.target as HTMLSelectElement;
    this.service.setScenario(target.value);
  }

  toggleIncidentList() {
    console.log('Notification bell clicked');
  }
}
