import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

import { RouteMetadata } from '../../../shared/utils/route-metadata.util';

@Component({
  selector: 'app-owner-section',
  templateUrl: './owner-section.component.html',
  standalone: false
})
export class OwnerSectionComponent {
  readonly metadata$ = this.route.data.pipe(map((data) => data as RouteMetadata));

  constructor(private readonly route: ActivatedRoute) {}
}
