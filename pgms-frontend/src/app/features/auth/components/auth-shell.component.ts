import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

import { RouteMetadata } from '../../../shared/utils/route-metadata.util';

@Component({
  selector: 'app-auth-shell',
  templateUrl: './auth-shell.component.html',
  styleUrls: ['./auth-shell.component.scss'],
  standalone: false
})
export class AuthShellComponent {
  readonly metadata$ = this.route.data.pipe(
    map((data) => data as RouteMetadata)
  );

  constructor(private readonly route: ActivatedRoute) {}
}
