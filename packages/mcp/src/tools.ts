/*
 * MCP tool definitions for the standalone stdio package.
 * Side-effect-free module so tests can pin the schema contract without
 * starting the stdio server loop.
 */
export const MCP_TOOLS_DEFINITIONS = [
  {
    name: 'mobile_layout_status',
    description: 'Get live status of MobileLayout Studio, connected target Angular/Ionic app, active device, and proxy state.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'mobile_layout_get_element',
    description: 'Get details of the currently inspected element or find an element by selector in the mobile canvas (tag, attributes, computed styles, box model, safe area insets, and layout warnings).',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Optional CSS selector (e.g. "ion-button#login-btn"). If omitted, returns the currently selected element.'
        }
      }
    }
  },
  {
    name: 'mobile_layout_apply_style',
    description: 'Apply live CSS styles to an element in the mobile preview canvas (e.g. minHeight="48px", paddingTop="47px", backgroundColor="#3880ff"). Renders immediately in the viewport.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the element to modify.'
        },
        styles: {
          type: 'object',
          description: 'Key-value map of CSS properties to apply.',
          additionalProperties: { type: 'string' }
        }
      },
      required: ['styles']
    }
  },
  {
    name: 'mobile_layout_apply_attribute',
    description: 'Apply or update HTML attributes on an element in the mobile preview canvas (e.g. color="primary", fill="outline", expand="block", shape="round").',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the element to modify.'
        },
        attributes: {
          type: 'object',
          description: 'Key-value map of HTML attributes to apply.',
          additionalProperties: { type: 'string' }
        }
      },
      required: ['attributes']
    }
  },
  {
    name: 'mobile_layout_update_text',
    description: 'Update the text content of an element in the live mobile preview (e.g. button labels, card titles, headlines).',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the element.'
        },
        text: {
          type: 'string',
          description: 'The new text content.'
        }
      },
      required: ['text']
    }
  },
  {
    name: 'mobile_layout_insert_component',
    description: 'Insert an Ionic component or mobile template snippet into the live mobile canvas (e.g. buttons, cards, searchbars, login templates, or profile templates).',
    inputSchema: {
      type: 'object',
      properties: {
        snippet: {
          type: 'string',
          description: 'HTML markup snippet to insert.'
        },
        name: {
          type: 'string',
          description: 'Descriptive name of the inserted component.'
        },
        targetSelector: {
          type: 'string',
          description: 'CSS selector of element to insert near (defaults to active element or body).'
        },
        position: {
          type: 'string',
          enum: ['after', 'before', 'prepend', 'append'],
          description: 'Placement relative to target element (default: "after").'
        }
      },
      required: ['snippet']
    }
  },
  {
    name: 'mobile_layout_scan_source',
    description: 'Scan the Angular/Ionic project files on disk to locate the exact template (.html) and stylesheet (.scss) file and line number corresponding to an inspected mobile element.',
    inputSchema: {
      type: 'object',
      properties: {
        tagName: {
          type: 'string',
          description: 'Tag name of the element (e.g. "ion-button", "ion-card").'
        },
        id: {
          type: 'string',
          description: 'Element ID attribute if any.'
        },
        classList: {
          type: 'array',
          items: { type: 'string' },
          description: 'Class list array.'
        },
        textContent: {
          type: 'string',
          description: 'Text content snippet of the element.'
        },
        projectPath: {
          type: 'string',
          description: 'Optional custom Angular project root directory.'
        }
      },
      required: ['tagName']
    }
  },
  {
    name: 'mobile_layout_apply_source_patch',
    description: 'Write verified code changes directly to the Angular/Ionic component (.html and/or .scss) files on disk, triggering Angular HMR live reload with automatic backup.',
    inputSchema: {
      type: 'object',
      properties: {
        htmlFilePath: {
          type: 'string',
          description: 'Path to Angular template HTML file.'
        },
        updatedHtmlContent: {
          type: 'string',
          description: 'Full new HTML file content.'
        },
        scssFilePath: {
          type: 'string',
          description: 'Optional path to SCSS stylesheet file.'
        },
        updatedScssContent: {
          type: 'string',
          description: 'Optional new SCSS stylesheet content.'
        }
      }
    }
  },
  {
    name: 'mobile_layout_run_uiux_audit',
    description: 'Run a screen-wide mobile UI/UX and accessibility audit on the active mobile screen. Checks touch target hitboxes (Apple HIG 44px min), notch & home indicator safe area insets, WCAG AA color contrast, and Ionic component best practices.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'mobile_layout_set_device',
    description: 'Switch the active mobile viewport preset in MobileLayout (e.g. "pixel-8-pro", "galaxy-s24-ultra", "galaxy-s23", "iphone-15", "z-fold-5-open", "galaxy-tab-s9", "responsive").',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'Device preset ID (e.g. "pixel-8-pro", "galaxy-s24-ultra", "iphone-15").'
        },
        isLandscape: {
          type: 'boolean',
          description: 'Toggle landscape orientation.'
        }
      },
      required: ['deviceId']
    }
  },
  {
    name: 'mobile_layout_get_llm_logs',
    description: 'Retrieve the recent LLM telemetry logs recorded by MobileLayout Studio (prompts sent, model used, latency, generated patches, errors).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of log entries to return (default: 20).'
        }
      }
    }
  },
  {
    name: 'mobile_layout_generate_patch',
    description: 'Send a natural-language UI intent to the configured OpenCode service and return an HTML/SCSS diff for review. Never writes to disk; apply changes with mobile_layout_apply_source_patch after review.',
    inputSchema: {
      type: 'object',
      properties: {
        userIntent: {
          type: 'string',
          description: 'Natural-language description of the UI/UX change to generate.'
        },
        htmlFilePath: {
          type: 'string',
          description: 'Project-relative path to the Angular template (.html) being changed.'
        },
        scssFilePath: {
          type: 'string',
          description: 'Optional project-relative path to the stylesheet (.scss) being changed.'
        },
        matchedSnippet: {
          type: 'string',
          description: 'The exact template snippet of the selected element.'
        },
        fullHtmlContent: {
          type: 'string',
          description: 'Full current HTML content. If omitted, it is read from disk at htmlFilePath.'
        },
        fullScssContent: {
          type: 'string',
          description: 'Full current SCSS content. If omitted, it is read from disk at scssFilePath.'
        },
        visualChanges: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['style', 'attribute', 'class', 'insert', 'remove', 'reorder', 'duplicate'] },
              name: { type: 'string' },
              value: { type: 'string' },
              previousValue: { type: 'string' },
              selector: { type: 'string', description: 'CSS selector identifying the element for structural changes.' },
              selectorPath: { type: 'string', description: 'Full selector path from the canvas root for unambiguous targeting.' },
              relativeTo: { type: 'string', description: 'reorder: the sibling element (selector or tag) the element moves relative to.' },
              direction: { type: 'string', enum: ['up', 'down'], description: 'reorder: movement direction relative to the sibling.' }
            },
            required: ['type', 'name', 'value']
          },
          description: 'Staged visual changes to apply. Structural types (reorder/duplicate/remove) identify elements by selector/selectorPath.'
        }
      },
      required: ['userIntent']
    }
  }
];
