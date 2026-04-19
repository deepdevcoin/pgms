import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-feature-placeholder',
  templateUrl: './feature-placeholder.component.html',
  styleUrls: ['./feature-placeholder.component.scss'],
  standalone: false
})
export class FeaturePlaceholderComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() callout = 'This screen is scaffolded and ready for the next implementation step.';
}
