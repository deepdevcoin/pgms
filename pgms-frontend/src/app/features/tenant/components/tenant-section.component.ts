import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

import { RouteMetadata } from '../../../shared/utils/route-metadata.util';

@Component({
  selector: 'app-tenant-section',
  templateUrl: './tenant-section.component.html',
  standalone: false
})
export class TenantSectionComponent {
  readonly metadata$ = this.route.data.pipe(map((data) => data as RouteMetadata));

  constructor(private readonly route: ActivatedRoute) {}
}
