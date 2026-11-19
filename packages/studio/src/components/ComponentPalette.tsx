import React, { useState } from 'react';
import { 
  Square, 
  CreditCard, 
  List, 
  Tag, 
  Search, 
  ToggleLeft, 
  Copy, 
  Plus, 
  Check, 
  ChevronRight, 
  ChevronDown, 
  Shield, 
  Space, 
  Split,
  Smartphone,
  User,
  ShoppingBag,
  Settings,
  LayoutGrid,
  MessageSquare,
  PanelBottom,
  Sparkles,
  Layers
} from 'lucide-react';

interface ComponentItem {
  name: string;
  tag: string;
  description: string;
  snippet: string;
  icon: any;
}

interface TemplateItem {
  name: string;
  category: string;
  description: string;
  tag: string;
  snippet: string;
  icon: any;
}

const IONIC_CATALOG: { category: string; items: ComponentItem[] }[] = [
  {
    category: 'Buttons & Badges',
    items: [
      {
        name: 'Primary Button',
        tag: 'ion-button',
        description: 'Standard block action button',
        snippet: '<ion-button expand="block" color="primary">Click Me</ion-button>',
        icon: Square
      },
      {
        name: 'Outline Pill Button',
        tag: 'ion-button',
        description: 'Secondary rounded outline button',
        snippet: '<ion-button fill="outline" shape="round" color="secondary">Action</ion-button>',
        icon: Square
      },
      {
        name: 'Badge',
        tag: 'ion-badge',
        description: 'Status or notification counter',
        snippet: '<ion-badge color="success">New</ion-badge>',
        icon: Tag
      },
      {
        name: 'Chip',
        tag: 'ion-chip',
        description: 'Compact tag with icon',
        snippet: '<ion-chip color="tertiary"><ion-icon name="pin" slot="start"></ion-icon><ion-label>Location</ion-label></ion-chip>',
        icon: Tag
      }
    ]
  },
  {
    category: 'Cards & Lists',
    items: [
      {
        name: 'Content Card',
        tag: 'ion-card',
        description: 'Card with title, subtitle, and body',
        snippet: `<ion-card>
  <ion-card-header>
    <ion-card-subtitle>Category</ion-card-subtitle>
    <ion-card-title>Card Title</ion-card-title>
  </ion-card-header>
  <ion-card-content>
    Here's a small text description for the card content.
  </ion-card-content>
</ion-card>`,
        icon: CreditCard
      },
      {
        name: 'List Item with Icon',
        tag: 'ion-item',
        description: 'Clickable list entry with start icon',
        snippet: `<ion-item button detail="true">
  <ion-icon name="person" slot="start" color="primary"></ion-icon>
  <ion-label>User Profile</ion-label>
</ion-item>`,
        icon: List
      }
    ]
  },
  {
    category: 'Inputs & Controls',
    items: [
      {
        name: 'Searchbar',
        tag: 'ion-searchbar',
        description: 'Interactive search input',
        snippet: '<ion-searchbar placeholder="Search items..."></ion-searchbar>',
        icon: Search
      },
      {
        name: 'Toggle Switch',
        tag: 'ion-toggle',
        description: 'Interactive switch with label',
        snippet: '<ion-toggle color="primary" [checked]="true">Enable Notifications</ion-toggle>',
        icon: ToggleLeft
      }
    ]
  },
  {
    category: 'Layout & Secure Area',
    items: [
      {
        name: 'Top Secure Area Spacer',
        tag: 'div',
        description: 'Status bar / notch safe-area spacer',
        snippet: '<div style="height: env(safe-area-inset-top, 47px); width: 100%; pointer-events: none;" class="ion-safe-area-top"></div>',
        icon: Shield
      },
      {
        name: 'Bottom Secure Area Spacer',
        tag: 'div',
        description: 'Home indicator bar safe-area spacer',
        snippet: '<div style="height: env(safe-area-inset-bottom, 34px); width: 100%; pointer-events: none;" class="ion-safe-area-bottom"></div>',
        icon: Shield
      },
      {
        name: 'Secure Area Container',
        tag: 'div',
        description: 'Full-width container with mobile safe-area insets',
        snippet: '<div style="padding-top: env(safe-area-inset-top, 47px); padding-bottom: env(safe-area-inset-bottom, 34px); width: 100%;">\n  <!-- Content inside safe area -->\n</div>',
        icon: Shield
      },
      {
        name: 'Vertical Space (16px)',
        tag: 'div',
        description: '16px vertical spacing element',
        snippet: '<div style="height: 16px; width: 100%;" class="spacer-16"></div>',
        icon: Space
      },
      {
        name: 'Vertical Space (32px)',
        tag: 'div',
        description: '32px vertical spacing element',
        snippet: '<div style="height: 32px; width: 100%;" class="spacer-32"></div>',
        icon: Space
      },
      {
        name: 'Horizontal Divider Line',
        tag: 'div',
        description: 'Thin separation line with margin',
        snippet: '<div style="height: 1px; width: 100%; background: rgba(148, 163, 184, 0.2); margin: 12px 0;"></div>',
        icon: Split
      },
      {
        name: 'Flex Space Expander',
        tag: 'div',
        description: 'Expands to fill available flex space',
        snippet: '<div style="flex: 1 1 auto;"></div>',
        icon: Space
      }
    ]
  }
];

const IONIC_TEMPLATES: TemplateItem[] = [
  {
    name: 'Login & Auth Screen',
    category: 'Auth & Onboarding',
    description: 'Header, brand logo, email/password inputs, login CTA, and social auth buttons',
    tag: 'div',
    icon: User,
    snippet: `<div class="template-login" style="padding: 24px 16px; width: 100%; box-sizing: border-box; display: flex; flex-direction: column;">
  <div style="text-align: center; margin-top: 16px; margin-bottom: 28px;">
    <div style="width: 60px; height: 60px; border-radius: 16px; background: linear-gradient(135deg, #3880ff, #5260ff); margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(56, 128, 255, 0.4);">
      <ion-icon name="flash" style="font-size: 30px; color: #ffffff;"></ion-icon>
    </div>
    <h2 style="margin: 0; font-size: 22px; font-weight: 700; color: var(--ion-text-color, #1e293b);">Welcome Back</h2>
    <p style="margin: 4px 0 0; font-size: 13px; color: var(--ion-color-medium, #64748b);">Sign in to continue to your account</p>
  </div>

  <div style="display: flex; flex-direction: column; gap: 12px;">
    <ion-item fill="outline" shape="round" style="--background: var(--ion-item-background, rgba(255,255,255,0.06));">
      <ion-icon name="mail-outline" slot="start" color="medium"></ion-icon>
      <ion-input type="email" placeholder="name@example.com" label="Email" label-placement="floating"></ion-input>
    </ion-item>

    <ion-item fill="outline" shape="round" style="--background: var(--ion-item-background, rgba(255,255,255,0.06));">
      <ion-icon name="lock-closed-outline" slot="start" color="medium"></ion-icon>
      <ion-input type="password" placeholder="••••••••" label="Password" label-placement="floating"></ion-input>
      <ion-button fill="clear" slot="end" aria-label="Show/hide password">
        <ion-icon slot="icon-only" name="eye-outline" color="medium"></ion-icon>
      </ion-button>
    </ion-item>

    <div style="display: flex; justify-content: flex-end;">
      <a href="#" style="font-size: 12px; color: var(--ion-color-primary, #3880ff); text-decoration: none; font-weight: 500;">Forgot password?</a>
    </div>

    <ion-button expand="block" shape="round" color="primary" style="margin-top: 8px; height: 46px; font-weight: 600;">
      Sign In
    </ion-button>
  </div>

  <div style="margin-top: 24px; text-align: center;">
    <div style="position: relative; margin-bottom: 16px;">
      <div style="height: 1px; background: rgba(148, 163, 184, 0.2);"></div>
      <span style="position: absolute; top: -9px; left: 50%; transform: translateX(-50%); background: var(--ion-background-color, #ffffff); padding: 0 10px; font-size: 11px; color: var(--ion-color-medium, #64748b);">Or continue with</span>
    </div>

    <div style="display: flex; gap: 10px; justify-content: center;">
      <ion-button fill="outline" shape="round" style="flex: 1; height: 40px; font-size: 12px;">
        <ion-icon slot="start" name="logo-google"></ion-icon>
        Google
      </ion-button>
      <ion-button fill="outline" shape="round" style="flex: 1; height: 40px; font-size: 12px;">
        <ion-icon slot="start" name="logo-apple"></ion-icon>
        Apple
      </ion-button>
    </div>

    <p style="margin-top: 20px; font-size: 12px; color: var(--ion-color-medium, #64748b);">
      Don't have an account? <a href="#" style="color: var(--ion-color-primary, #3880ff); font-weight: 600; text-decoration: none;">Sign Up</a>
    </p>
  </div>
</div>`
  },
  {
    name: 'User Profile & Stats Screen',
    category: 'User & Profile',
    description: 'Avatar with status, bio, 3-column stats bar, action buttons, and segmented media grid',
    tag: 'div',
    icon: User,
    snippet: `<div class="template-profile" style="padding: 16px; width: 100%; box-sizing: border-box;">
  <div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 18px;">
    <div style="position: relative; margin-bottom: 10px;">
      <ion-avatar style="width: 80px; height: 80px; border: 3px solid var(--ion-color-primary, #3880ff); box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" alt="Avatar" />
      </ion-avatar>
      <div style="position: absolute; bottom: 2px; right: 2px; width: 14px; height: 14px; border-radius: 50%; background: #2dd36f; border: 2px solid #ffffff;"></div>
    </div>
    <h3 style="margin: 0; font-size: 18px; font-weight: 700;">Sarah Jenkins</h3>
    <span style="font-size: 12px; color: var(--ion-color-medium, #64748b);">@sarah_ux &bull; Senior Product Designer</span>
    <p style="margin: 6px 0 0; font-size: 12px; max-width: 270px; line-height: 1.4; color: var(--ion-text-color, #334155);">
      Crafting intuitive mobile experiences with Ionic & Capacitor. Travel lover & photography enthusiast 📸
    </p>
  </div>

  <div style="display: flex; justify-content: space-around; background: var(--ion-color-light, rgba(255,255,255,0.05)); border-radius: 12px; padding: 10px 8px; margin-bottom: 14px; border: 1px solid rgba(148, 163, 184, 0.15);">
    <div style="text-align: center;">
      <div style="font-size: 16px; font-weight: 700; color: var(--ion-text-color, #1e293b);">148</div>
      <div style="font-size: 10px; color: var(--ion-color-medium, #64748b); text-transform: uppercase; font-weight: 600;">Posts</div>
    </div>
    <div style="width: 1px; background: rgba(148, 163, 184, 0.2);"></div>
    <div style="text-align: center;">
      <div style="font-size: 16px; font-weight: 700; color: var(--ion-text-color, #1e293b);">12.4k</div>
      <div style="font-size: 10px; color: var(--ion-color-medium, #64748b); text-transform: uppercase; font-weight: 600;">Followers</div>
    </div>
    <div style="width: 1px; background: rgba(148, 163, 184, 0.2);"></div>
    <div style="text-align: center;">
      <div style="font-size: 16px; font-weight: 700; color: var(--ion-text-color, #1e293b);">492</div>
      <div style="font-size: 10px; color: var(--ion-color-medium, #64748b); text-transform: uppercase; font-weight: 600;">Following</div>
    </div>
  </div>

  <div style="display: flex; gap: 8px; margin-bottom: 14px;">
    <ion-button expand="block" shape="round" color="primary" style="flex: 2; height: 38px; font-weight: 600;">Edit Profile</ion-button>
    <ion-button expand="block" fill="outline" shape="round" color="medium" style="flex: 1; height: 38px;">Share</ion-button>
  </div>

  <ion-segment value="grid" style="margin-bottom: 10px;">
    <ion-segment-button value="grid"><ion-icon name="grid-outline"></ion-icon></ion-segment-button>
    <ion-segment-button value="bookmark"><ion-icon name="bookmark-outline"></ion-icon></ion-segment-button>
    <ion-segment-button value="heart"><ion-icon name="heart-outline"></ion-icon></ion-segment-button>
  </ion-segment>
</div>`
  },
  {
    name: 'E-Commerce Product Feed',
    category: 'Commerce & Retail',
    description: 'Searchbar, horizontal category filter chips, 2-column product grid with badges and pricing',
    tag: 'div',
    icon: ShoppingBag,
    snippet: `<div class="template-ecommerce" style="width: 100%; box-sizing: border-box; padding: 12px 6px;">
  <ion-searchbar placeholder="Search shoes, apparel..." style="padding: 0 4px 8px;"></ion-searchbar>

  <div style="display: flex; gap: 6px; overflow-x: auto; padding: 2px 4px 10px; scrollbar-width: none;">
    <ion-chip color="primary"><ion-label>All Items</ion-label></ion-chip>
    <ion-chip fill="outline"><ion-label>🔥 Trending</ion-label></ion-chip>
    <ion-chip fill="outline"><ion-label>Sneakers</ion-label></ion-chip>
    <ion-chip fill="outline"><ion-label>Hoodies</ion-label></ion-chip>
  </div>

  <ion-grid style="--ion-grid-padding: 0px;">
    <ion-row>
      <ion-col size="6">
        <ion-card style="margin: 4px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="position: relative; height: 110px; background: #e2e8f0; display: flex; align-items: center; justify-content: center;">
            <ion-badge color="danger" style="position: absolute; top: 6px; left: 6px;">-25%</ion-badge>
            <span style="font-size: 32px;">👟</span>
          </div>
          <ion-card-header style="padding: 6px 8px 2px;">
            <ion-card-subtitle style="font-size: 10px;">Running</ion-card-subtitle>
            <ion-card-title style="font-size: 13px; font-weight: 700;">Aero Speed Pro</ion-card-title>
          </ion-card-header>
          <ion-card-content style="padding: 0 8px 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-weight: 700; font-size: 14px; color: var(--ion-color-primary, #3880ff);">$89</span>
              <span style="font-size: 10px; text-decoration: line-through; color: var(--ion-color-medium, #94a3b8); margin-left: 3px;">$119</span>
            </div>
            <ion-button size="small" shape="round" color="primary">
              <ion-icon slot="icon-only" name="cart-outline"></ion-icon>
            </ion-button>
          </ion-card-content>
        </ion-card>
      </ion-col>

      <ion-col size="6">
        <ion-card style="margin: 4px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="position: relative; height: 110px; background: #e2e8f0; display: flex; align-items: center; justify-content: center;">
            <ion-badge color="success" style="position: absolute; top: 6px; left: 6px;">NEW</ion-badge>
            <span style="font-size: 32px;">🎧</span>
          </div>
          <ion-card-header style="padding: 6px 8px 2px;">
            <ion-card-subtitle style="font-size: 10px;">Audio</ion-card-subtitle>
            <ion-card-title style="font-size: 13px; font-weight: 700;">Pulse Wireless Max</ion-card-title>
          </ion-card-header>
          <ion-card-content style="padding: 0 8px 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-weight: 700; font-size: 14px; color: var(--ion-color-primary, #3880ff);">$149</span>
            </div>
            <ion-button size="small" shape="round" color="primary">
              <ion-icon slot="icon-only" name="cart-outline"></ion-icon>
            </ion-button>
          </ion-card-content>
        </ion-card>
      </ion-col>
    </ion-row>
  </ion-grid>
</div>`
  },
  {
    name: 'Settings & Preferences Group',
    category: 'Navigation & Lists',
    description: 'Grouped iOS/Material style settings list with toggle switches, chevron items, and logout CTA',
    tag: 'div',
    icon: Settings,
    snippet: `<div class="template-settings" style="width: 100%; box-sizing: border-box; padding: 12px;">
  <ion-list-header style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; color: var(--ion-color-medium, #64748b);">
    <ion-label>Account & Security</ion-label>
  </ion-list-header>

  <ion-list inset="true" style="margin-top: 4px; margin-bottom: 14px;">
    <ion-item button detail="true">
      <ion-icon name="person-outline" slot="start" color="primary"></ion-icon>
      <ion-label>Personal Information</ion-label>
    </ion-item>
    <ion-item button detail="true">
      <ion-icon name="shield-checkmark-outline" slot="start" color="success"></ion-icon>
      <ion-label>Two-Factor Authentication</ion-label>
      <ion-note slot="end" color="success">Active</ion-note>
    </ion-item>
    <ion-item button detail="true">
      <ion-icon name="card-outline" slot="start" color="tertiary"></ion-icon>
      <ion-label>Payment Methods</ion-label>
      <ion-note slot="end">Visa &bull;&bull; 4242</ion-note>
    </ion-item>
  </ion-list>

  <ion-list-header style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; color: var(--ion-color-medium, #64748b);">
    <ion-label>Preferences</ion-label>
  </ion-list-header>

  <ion-list inset="true" style="margin-top: 4px; margin-bottom: 20px;">
    <ion-item>
      <ion-icon name="notifications-outline" slot="start" color="warning"></ion-icon>
      <ion-toggle [checked]="true" justify="space-between">Push Notifications</ion-toggle>
    </ion-item>
    <ion-item>
      <ion-icon name="moon-outline" slot="start" color="medium"></ion-icon>
      <ion-toggle [checked]="false" justify="space-between">Dark Theme</ion-toggle>
    </ion-item>
    <ion-item>
      <ion-icon name="volume-medium-outline" slot="start" color="secondary"></ion-icon>
      <ion-toggle [checked]="true" justify="space-between">Sound Effects</ion-toggle>
    </ion-item>
  </ion-list>

  <ion-button expand="block" fill="outline" color="danger" shape="round" style="height: 44px; font-weight: 600;">
    <ion-icon slot="start" name="log-out-outline"></ion-icon>
    Log Out
  </ion-button>
</div>`
  },
  {
    name: 'Dashboard Analytics KPI Cards',
    category: 'Dashboards & Metrics',
    description: '4 KPI cards in a 2x2 grid with growth indicators, revenue numbers, and quick actions',
    tag: 'div',
    icon: LayoutGrid,
    snippet: `<div class="template-dashboard" style="width: 100%; box-sizing: border-box; padding: 12px 6px;">
  <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 6px 10px;">
    <div>
      <h3 style="margin: 0; font-size: 16px; font-weight: 700;">Performance</h3>
      <p style="margin: 2px 0 0; font-size: 11px; color: var(--ion-color-medium, #64748b);">Last 30 days &bull; Live overview</p>
    </div>
    <ion-badge color="success" style="padding: 4px 8px; font-size: 11px;">+18.4%</ion-badge>
  </div>

  <ion-grid style="--ion-grid-padding: 0px;">
    <ion-row>
      <ion-col size="6">
        <ion-card style="margin: 4px; border-radius: 12px; padding: 10px; border: 1px solid rgba(148, 163, 184, 0.15);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 11px; color: var(--ion-color-medium, #64748b); font-weight: 600;">Revenue</span>
            <ion-icon name="trending-up" color="success" style="font-size: 15px;"></ion-icon>
          </div>
          <div style="font-size: 20px; font-weight: 800; color: var(--ion-text-color, #1e293b);">$24,850</div>
          <div style="font-size: 10px; color: #2dd36f; margin-top: 3px; font-weight: 600;">&uarr; +12.5%</div>
        </ion-card>
      </ion-col>

      <ion-col size="6">
        <ion-card style="margin: 4px; border-radius: 12px; padding: 10px; border: 1px solid rgba(148, 163, 184, 0.15);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 11px; color: var(--ion-color-medium, #64748b); font-weight: 600;">Users</span>
            <ion-icon name="people" color="primary" style="font-size: 15px;"></ion-icon>
          </div>
          <div style="font-size: 20px; font-weight: 800; color: var(--ion-text-color, #1e293b);">1,420</div>
          <div style="font-size: 10px; color: #2dd36f; margin-top: 3px; font-weight: 600;">&uarr; +8.2%</div>
        </ion-card>
      </ion-col>

      <ion-col size="6">
        <ion-card style="margin: 4px; border-radius: 12px; padding: 10px; border: 1px solid rgba(148, 163, 184, 0.15);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 11px; color: var(--ion-color-medium, #64748b); font-weight: 600;">Orders</span>
            <ion-icon name="cart" color="warning" style="font-size: 15px;"></ion-icon>
          </div>
          <div style="font-size: 20px; font-weight: 800; color: var(--ion-text-color, #1e293b);">384</div>
          <div style="font-size: 10px; color: #eb445a; margin-top: 3px; font-weight: 600;">&darr; -2.1%</div>
        </ion-card>
      </ion-col>

      <ion-col size="6">
        <ion-card style="margin: 4px; border-radius: 12px; padding: 10px; border: 1px solid rgba(148, 163, 184, 0.15);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 11px; color: var(--ion-color-medium, #64748b); font-weight: 600;">Rate</span>
            <ion-icon name="pie-chart" color="tertiary" style="font-size: 15px;"></ion-icon>
          </div>
          <div style="font-size: 20px; font-weight: 800; color: var(--ion-text-color, #1e293b);">3.6%</div>
          <div style="font-size: 10px; color: #2dd36f; margin-top: 3px; font-weight: 600;">&uarr; +0.4%</div>
        </ion-card>
      </ion-col>
    </ion-row>
  </ion-grid>
</div>`
  },
  {
    name: 'Chat & Message Thread',
    category: 'Communication',
    description: 'Header with online status, message bubbles with timestamps, and fixed bottom input toolbar',
    tag: 'div',
    icon: MessageSquare,
    snippet: `<div class="template-chat" style="display: flex; flex-direction: column; width: 100%; box-sizing: border-box; min-height: 360px;">
  <!-- Chat Header -->
  <div style="display: flex; align-items: center; padding: 10px 14px; border-bottom: 1px solid rgba(148, 163, 184, 0.2); background: var(--ion-toolbar-background, rgba(255,255,255,0.03));">
    <div style="position: relative; margin-right: 10px;">
      <ion-avatar style="width: 36px; height: 36px;">
        <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80" alt="Avatar" />
      </ion-avatar>
      <div style="position: absolute; bottom: 0; right: 0; width: 9px; height: 9px; border-radius: 50%; background: #2dd36f; border: 2px solid #ffffff;"></div>
    </div>
    <div style="flex: 1;">
      <h4 style="margin: 0; font-size: 13px; font-weight: 700;">Alex Rivera</h4>
      <span style="font-size: 10px; color: #2dd36f; font-weight: 500;">Online now</span>
    </div>
    <ion-button fill="clear" size="small"><ion-icon slot="icon-only" name="call-outline"></ion-icon></ion-button>
  </div>

  <!-- Messages List -->
  <div style="flex: 1; padding: 14px 10px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto;">
    <!-- Incoming -->
    <div style="display: flex; gap: 6px; max-width: 82%;">
      <div style="background: var(--ion-color-light, #f1f5f9); color: var(--ion-text-color, #1e293b); padding: 8px 12px; border-radius: 14px 14px 14px 3px; font-size: 12px; line-height: 1.4; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        Hey! Have you had a chance to test the new Ionic capacitor build?
        <div style="font-size: 9px; color: var(--ion-color-medium, #94a3b8); margin-top: 3px; text-align: right;">10:24 AM</div>
      </div>
    </div>

    <!-- Outgoing -->
    <div style="display: flex; justify-content: flex-end; width: 100%;">
      <div style="background: var(--ion-color-primary, #3880ff); color: #ffffff; padding: 8px 12px; border-radius: 14px 14px 3px 14px; font-size: 12px; line-height: 1.4; max-width: 82%; box-shadow: 0 2px 6px rgba(56, 128, 255, 0.3);">
        Yes, works super smooth! Just tweaking the safe area padding now.
        <div style="font-size: 9px; color: rgba(255,255,255,0.7); margin-top: 3px; text-align: right;">10:26 AM &bull; ✓✓</div>
      </div>
    </div>
  </div>

  <!-- Chat Input Bar -->
  <div style="display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-top: 1px solid rgba(148, 163, 184, 0.2); background: var(--ion-background-color, #ffffff);">
    <ion-button fill="clear" size="small"><ion-icon slot="icon-only" name="attach-outline"></ion-icon></ion-button>
    <ion-input placeholder="Type a message..." style="flex: 1; --background: var(--ion-color-light, #f1f5f9); --padding-start: 10px; border-radius: 18px; font-size: 12px;"></ion-input>
    <ion-button shape="round" color="primary" size="small"><ion-icon slot="icon-only" name="send"></ion-icon></ion-button>
  </div>
</div>`
  },
  {
    name: 'Bottom Sheet Action Modal',
    category: 'Modals & Overlays',
    description: 'Mobile drag handle pill, title, action items with icons, and cancel button',
    tag: 'div',
    icon: PanelBottom,
    snippet: `<div class="template-bottom-sheet" style="width: 100%; box-sizing: border-box; background: var(--ion-item-background, #ffffff); border-radius: 18px 18px 0 0; padding: 10px 14px 20px; box-shadow: 0 -4px 20px rgba(0,0,0,0.15); border: 1px solid rgba(148, 163, 184, 0.2);">
  <!-- Drag Handle -->
  <div style="width: 32px; height: 4px; background: rgba(148, 163, 184, 0.4); border-radius: 2px; margin: 0 auto 12px;"></div>

  <h3 style="margin: 0 0 2px; font-size: 15px; font-weight: 700; text-align: center;">Share & Actions</h3>
  <p style="margin: 0 0 12px; font-size: 11px; color: var(--ion-color-medium, #64748b); text-align: center;">Select an action to continue</p>

  <ion-list lines="none" style="background: transparent; margin-bottom: 10px;">
    <ion-item button detail="false" style="--border-radius: 8px; margin-bottom: 4px; --background: var(--ion-color-light, rgba(255,255,255,0.05));">
      <ion-icon name="share-social-outline" slot="start" color="primary"></ion-icon>
      <ion-label style="font-weight: 600; font-size: 13px;">Share with friends</ion-label>
    </ion-item>
    <ion-item button detail="false" style="--border-radius: 8px; margin-bottom: 4px; --background: var(--ion-color-light, rgba(255,255,255,0.05));">
      <ion-icon name="link-outline" slot="start" color="tertiary"></ion-icon>
      <ion-label style="font-weight: 600; font-size: 13px;">Copy Link</ion-label>
    </ion-item>
    <ion-item button detail="false" style="--border-radius: 8px; margin-bottom: 4px; --background: var(--ion-color-light, rgba(255,255,255,0.05));">
      <ion-icon name="bookmark-outline" slot="start" color="warning"></ion-icon>
      <ion-label style="font-weight: 600; font-size: 13px;">Save to Collection</ion-label>
    </ion-item>
  </ion-list>

  <ion-button expand="block" fill="outline" shape="round" color="medium" style="height: 40px; font-weight: 600;">
    Cancel
  </ion-button>
</div>`
  },
  {
    name: 'Onboarding Hero Slide',
    category: 'Auth & Onboarding',
    description: 'Value prop hero card with illustration icon, bold headline, checkmarks, and primary CTA',
    tag: 'div',
    icon: Sparkles,
    snippet: `<div class="template-onboarding" style="padding: 20px 14px; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; text-align: center;">
  <div style="width: 70px; height: 70px; border-radius: 20px; background: linear-gradient(135deg, #3880ff, #2dd36f); display: flex; align-items: center; justify-content: center; margin-bottom: 18px; box-shadow: 0 6px 20px rgba(56, 128, 255, 0.35);">
    <ion-icon name="rocket-outline" style="font-size: 34px; color: #ffffff;"></ion-icon>
  </div>

  <h2 style="margin: 0 0 6px; font-size: 20px; font-weight: 800; color: var(--ion-text-color, #1e293b);">Design at Light Speed</h2>
  <p style="margin: 0 0 18px; font-size: 12px; color: var(--ion-color-medium, #64748b); line-height: 1.4; max-width: 270px;">
    Iterate mobile screens in real time with production-ready Ionic & Capacitor components.
  </p>

  <div style="width: 100%; display: flex; flex-direction: column; gap: 8px; margin-bottom: 22px; text-align: left;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <ion-icon name="checkmark-circle" color="success" style="font-size: 16px;"></ion-icon>
      <span style="font-size: 12px; font-weight: 500;">Instant hot reload & drag and drop</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <ion-icon name="checkmark-circle" color="success" style="font-size: 16px;"></ion-icon>
      <span style="font-size: 12px; font-weight: 500;">Safe area notch & bottom bar handling</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <ion-icon name="checkmark-circle" color="success" style="font-size: 16px;"></ion-icon>
      <span style="font-size: 12px; font-weight: 500;">Mobile pattern linter & automated fixes</span>
    </div>
  </div>

  <div style="display: flex; gap: 5px; margin-bottom: 16px;">
    <div style="width: 18px; height: 5px; border-radius: 3px; background: var(--ion-color-primary, #3880ff);"></div>
    <div style="width: 5px; height: 5px; border-radius: 3px; background: rgba(148, 163, 184, 0.3);"></div>
    <div style="width: 5px; height: 5px; border-radius: 3px; background: rgba(148, 163, 184, 0.3);"></div>
  </div>

  <ion-button expand="block" shape="round" color="primary" style="width: 100%; height: 44px; font-weight: 700;">
    Get Started
  </ion-button>
</div>`
  }
];

interface ComponentPaletteProps {
  onInsertSnippet: (snippet: string, name: string) => void;
}

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({ onInsertSnippet }) => {
  const [paletteTab, setPaletteTab] = useState<'components' | 'templates'>('components');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Buttons & Badges': true,
    'Cards & Lists': true,
    'Inputs & Controls': true,
    'Layout & Secure Area': true
  });

  const handleCopy = (snippet: string, tag: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto select-none">
      {/* Palette Mode Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs">
        <button
          onClick={() => setPaletteTab('components')}
          className={`flex-1 py-2 font-medium flex items-center justify-center space-x-1.5 border-b-2 transition-all ${
            paletteTab === 'components'
              ? 'border-blue-500 text-blue-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Components</span>
        </button>
        <button
          onClick={() => setPaletteTab('templates')}
          className={`flex-1 py-2 font-medium flex items-center justify-center space-x-1.5 border-b-2 transition-all ${
            paletteTab === 'templates'
              ? 'border-purple-500 text-purple-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>📱 Templates</span>
        </button>
      </div>

      <div className="p-2.5 border-b border-slate-800 bg-slate-900/40">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          {paletteTab === 'components' ? 'Ionic Components' : 'Mobile Templates'}
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {paletteTab === 'components' 
            ? 'Drag onto canvas or click + to insert'
            : 'Production-ready Ionic & Capacitor layouts'}
        </p>
      </div>

      {/* TAB 1: INDIVIDUAL COMPONENTS */}
      {paletteTab === 'components' && (
        <div className="p-2 space-y-3">
          {IONIC_CATALOG.map((cat) => {
            const isOpen = openCategories[cat.category] ?? true;
            return (
              <div key={cat.category} className="space-y-1">
                <button
                  onClick={() => toggleCategory(cat.category)}
                  className="w-full flex items-center justify-between px-2 py-1 text-slate-400 hover:text-slate-200 text-xs font-semibold"
                >
                  <span>{cat.category}</span>
                  {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {isOpen && (
                  <div className="space-y-1 pl-1">
                    {cat.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.name}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', item.snippet);
                            e.dataTransfer.setData('application/json', JSON.stringify({
                              name: item.name,
                              snippet: item.snippet,
                              tag: item.tag
                            }));
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          className="group flex flex-col p-2 rounded-lg border border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-700 transition-all text-xs cursor-grab active:cursor-grabbing"
                          title="Drag and drop onto mobile canvas or click + to insert"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-slate-500 group-hover:text-slate-300 font-mono text-[10px]">⠿</span>
                              <Icon className="w-3.5 h-3.5 text-blue-400" />
                              <span className="font-medium text-slate-200">{item.name}</span>
                            </div>

                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleCopy(item.snippet, item.name)}
                                title="Copy snippet"
                                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                              >
                                {copiedTag === item.name ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={() => onInsertSnippet(item.snippet, item.name)}
                                title="Prompt LLM to insert this component"
                                className="p-1 rounded hover:bg-blue-600 text-slate-400 hover:text-white"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <span className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                            {item.description}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: PREMADE MOBILE TEMPLATES */}
      {paletteTab === 'templates' && (
        <div className="p-2 space-y-2">
          {IONIC_TEMPLATES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.name}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', item.snippet);
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    name: item.name,
                    snippet: item.snippet,
                    tag: item.tag
                  }));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className="group flex flex-col p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-850 hover:border-purple-500/50 transition-all text-xs cursor-grab active:cursor-grabbing shadow-sm"
                title="Drag and drop onto canvas or click + to insert"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500 group-hover:text-purple-400 font-mono text-[10px]">⠿</span>
                    <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200 text-xs leading-tight">{item.name}</h4>
                      <span className="text-[9px] text-purple-400 font-mono uppercase tracking-wider">{item.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopy(item.snippet, item.name)}
                      title="Copy template HTML"
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                    >
                      {copiedTag === item.name ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      onClick={() => onInsertSnippet(item.snippet, item.name)}
                      title="Insert template into project"
                      className="p-1 rounded hover:bg-purple-600 text-slate-400 hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Ionic 7+ / Capacitor</span>
                  <span className="text-purple-400 font-medium group-hover:underline flex items-center space-x-0.5">
                    <span>Drop onto canvas</span>
                    <span>→</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
