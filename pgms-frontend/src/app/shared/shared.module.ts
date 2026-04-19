import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { FeaturePlaceholderComponent } from './components/feature-placeholder/feature-placeholder.component';
import { LoaderComponent } from './components/loader/loader.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { InitialsPipe } from './pipes/initials.pipe';

@NgModule({
  declarations: [
    NavbarComponent,
    SidebarComponent,
    LoaderComponent,
    FeaturePlaceholderComponent,
    InitialsPipe
  ],
  imports: [
    CommonModule,
    RouterModule
  ],
  exports: [
    CommonModule,
    RouterModule,
    NavbarComponent,
    SidebarComponent,
    LoaderComponent,
    FeaturePlaceholderComponent,
    InitialsPipe
  ]
})
export class SharedModule { }
