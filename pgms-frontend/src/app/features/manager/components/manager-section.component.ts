import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

import { RouteMetadata } from '../../../shared/utils/route-metadata.util';

@Component({
  selector: 'app-manager-section',
  templateUrl: './manager-section.component.html',
  standalone: false
})
export class ManagerSectionComponent {
  readonly metadata$ = this.route.data.pipe(map((data) => data as RouteMetadata));

  constructor(private readonly route: ActivatedRoute) {}
}
