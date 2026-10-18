/**
 * @license
 * SchemaForge — Visual Database Schema Designer
 * Full Vanilla JavaScript implementation with no external dependencies.
 *
 * SECTIONS:
 * 1. State and Store
 * 2. History (Undo / Redo)
 * 3. Canvas and Viewport (Pan, Zoom, Minimap, Grid, Marquee)
 * 4. Tables and Columns
 * 5. Relationships and Crow's Foot Lines
 * 6. SQL Generators (PostgreSQL, MySQL, SQLite)
 * 7. SQL Parser & Import
 * 8. Import and Export (SQL, PNG, SVG, JSON, URL Hash)
 * 9. UI Panels (Editor, Health, Command Palette, Modals, Templates)
 * 10. Event Handlers, Touch & Mobile Support
 */

// =============================================================================
// Helper Utilities & Safe Escaping
// =============================================================================
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// =============================================================================
// 1. STATE AND STORE
// =============================================================================
const PALETTE_COLORS = ['emerald', 'indigo', 'sky', 'amber', 'rose', 'purple', 'teal', 'slate'];

const DATA_TYPES = [
  'INT', 'BIGINT', 'VARCHAR', 'TEXT', 'BOOLEAN',
  'DATE', 'DATETIME', 'TIMESTAMP', 'DECIMAL', 'FLOAT',
  'JSON', 'UUID', 'ENUM'
];

const STARTER_TEMPLATES = {
  blog: {
    name: 'Blog & Publishing',
    tables: [
      {
        id: 't_users',
        name: 'users',
        color: 'indigo',
        comment: 'Registered users and authors',
        x: 80,
        y: 100,
        columns: [
          { id: 'c_u1', name: 'id', type: 'BIGINT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: 'Primary key' },
          { id: 'c_u2', name: 'username', type: 'VARCHAR', length: '50', isPk: false, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: 'Unique handle' },
          { id: 'c_u3', name: 'email', type: 'VARCHAR', length: '255', isPk: false, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: 'Login email' },
          { id: 'c_u4', name: 'password_hash', type: 'VARCHAR', length: '255', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_u5', name: 'bio', type: 'TEXT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: true, defaultValue: '', comment: 'Author bio' },
          { id: 'c_u6', name: 'created_at', type: 'TIMESTAMP', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', comment: '' }
        ]
      },
      {
        id: 't_categories',
        name: 'categories',
        color: 'emerald',
        comment: 'Post hierarchy & categories',
        x: 460,
        y: 100,
        columns: [
          { id: 'c_cat1', name: 'id', type: 'INT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_cat2', name: 'slug', type: 'VARCHAR', length: '80', isPk: false, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_cat3', name: 'name', type: 'VARCHAR', length: '100', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' }
        ]
      },
      {
        id: 't_posts',
        name: 'posts',
        color: 'sky',
        comment: 'Published and draft articles',
        x: 80,
        y: 400,
        columns: [
          { id: 'c_p1', name: 'id', type: 'BIGINT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_p2', name: 'author_id', type: 'BIGINT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK to users' },
          { id: 'c_p3', name: 'category_id', type: 'INT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: true, defaultValue: '', comment: 'FK to categories' },
          { id: 'c_p4', name: 'title', type: 'VARCHAR', length: '255', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_p5', name: 'slug', type: 'VARCHAR', length: '255', isPk: false, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_p6', name: 'content', type: 'TEXT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'Markdown content' },
          { id: 'c_p7', name: 'is_published', type: 'BOOLEAN', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: 'false', comment: '' },
          { id: 'c_p8', name: 'published_at', type: 'TIMESTAMP', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: true, defaultValue: '', comment: '' }
        ]
      },
      {
        id: 't_comments',
        name: 'comments',
        color: 'amber',
        comment: 'User comments on posts',
        x: 460,
        y: 350,
        columns: [
          { id: 'c_cm1', name: 'id', type: 'BIGINT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_cm2', name: 'post_id', type: 'BIGINT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK to posts' },
          { id: 'c_cm3', name: 'user_id', type: 'BIGINT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK to users' },
          { id: 'c_cm4', name: 'body', type: 'TEXT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_cm5', name: 'created_at', type: 'TIMESTAMP', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', comment: '' }
        ]
      },
      {
        id: 't_tags',
        name: 'tags',
        color: 'teal',
        comment: 'Article tagging taxonomy',
        x: 840,
        y: 100,
        columns: [
          { id: 'c_tg1', name: 'id', type: 'INT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_tg2', name: 'name', type: 'VARCHAR', length: '50', isPk: false, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: '' }
        ]
      },
      {
        id: 't_post_tags',
        name: 'post_tags',
        color: 'slate',
        comment: 'Post and tag junction',
        x: 840,
        y: 350,
        columns: [
          { id: 'c_pt1', name: 'post_id', type: 'BIGINT', length: '', isPk: true, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK to posts' },
          { id: 'c_pt2', name: 'tag_id', type: 'INT', length: '', isPk: true, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK to tags' }
        ]
      }
    ],
    relationships: [
      { id: 'r_1', sourceTableId: 't_users', sourceColumnId: 'c_u1', targetTableId: 't_posts', targetColumnId: 'c_p2', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { id: 'r_2', sourceTableId: 't_categories', sourceColumnId: 'c_cat1', targetTableId: 't_posts', targetColumnId: 'c_p3', cardinality: '1:N', onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { id: 'r_3', sourceTableId: 't_posts', sourceColumnId: 'c_p1', targetTableId: 't_comments', targetColumnId: 'c_cm2', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { id: 'r_4', sourceTableId: 't_users', sourceColumnId: 'c_u1', targetTableId: 't_comments', targetColumnId: 'c_cm3', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { id: 'r_5', sourceTableId: 't_posts', sourceColumnId: 'c_p1', targetTableId: 't_post_tags', targetColumnId: 'c_pt1', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { id: 'r_6', sourceTableId: 't_tags', sourceColumnId: 'c_tg1', targetTableId: 't_post_tags', targetColumnId: 'c_pt2', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' }
    ]
  },
  ecommerce: {
    name: 'E-Commerce Store',
    tables: [
      {
        id: 't_customers',
        name: 'customers',
        color: 'indigo',
        comment: 'Store customers',
        x: 80,
        y: 80,
        columns: [
          { id: 'c_c1', name: 'id', type: 'BIGINT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_c2', name: 'email', type: 'VARCHAR', length: '255', isPk: false, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_c3', name: 'first_name', type: 'VARCHAR', length: '100', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_c4', name: 'last_name', type: 'VARCHAR', length: '100', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_c5', name: 'created_at', type: 'TIMESTAMP', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', comment: '' }
        ]
      },
      {
        id: 't_orders',
        name: 'orders',
        color: 'sky',
        comment: 'Customer orders and status',
        x: 80,
        y: 380,
        columns: [
          { id: 'c_o1', name: 'id', type: 'BIGINT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_o2', name: 'customer_id', type: 'BIGINT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' },
          { id: 'c_o3', name: 'total_amount', type: 'DECIMAL', length: '10,2', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '0.00', comment: '' },
          { id: 'c_o4', name: 'status', type: 'VARCHAR', length: '30', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: "'pending'", comment: '' },
          { id: 'c_o5', name: 'placed_at', type: 'TIMESTAMP', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', comment: '' }
        ]
      },
      {
        id: 't_categories',
        name: 'categories',
        color: 'emerald',
        comment: 'Product catalog categories',
        x: 840,
        y: 80,
        columns: [
          { id: 'c_ec_cat1', name: 'id', type: 'INT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_ec_cat2', name: 'name', type: 'VARCHAR', length: '100', isPk: false, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: '' }
        ]
      },
      {
        id: 't_products',
        name: 'products',
        color: 'teal',
        comment: 'Product inventory catalog',
        x: 480,
        y: 80,
        columns: [
          { id: 'c_pr1', name: 'id', type: 'BIGINT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_pr2', name: 'category_id', type: 'INT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: true, defaultValue: '', comment: 'FK' },
          { id: 'c_pr3', name: 'sku', type: 'VARCHAR', length: '60', isPk: false, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_pr4', name: 'name', type: 'VARCHAR', length: '200', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_pr5', name: 'price', type: 'DECIMAL', length: '10,2', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '0.00', comment: '' },
          { id: 'c_pr6', name: 'stock_quantity', type: 'INT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '0', comment: '' }
        ]
      },
      {
        id: 't_order_items',
        name: 'order_items',
        color: 'amber',
        comment: 'Line items within an order',
        x: 480,
        y: 380,
        columns: [
          { id: 'c_oi1', name: 'id', type: 'BIGINT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_oi2', name: 'order_id', type: 'BIGINT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' },
          { id: 'c_oi3', name: 'product_id', type: 'BIGINT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' },
          { id: 'c_oi4', name: 'quantity', type: 'INT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '1', comment: '' },
          { id: 'c_oi5', name: 'unit_price', type: 'DECIMAL', length: '10,2', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '0.00', comment: '' }
        ]
      },
      {
        id: 't_payments',
        name: 'payments',
        color: 'rose',
        comment: 'Order transactions & payments',
        x: 80,
        y: 680,
        columns: [
          { id: 'c_pay1', name: 'id', type: 'BIGINT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_pay2', name: 'order_id', type: 'BIGINT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' },
          { id: 'c_pay3', name: 'amount', type: 'DECIMAL', length: '10,2', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '0.00', comment: '' },
          { id: 'c_pay4', name: 'provider', type: 'VARCHAR', length: '50', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_pay5', name: 'status', type: 'VARCHAR', length: '30', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: "'completed'", comment: '' }
        ]
      },
      {
        id: 't_reviews',
        name: 'reviews',
        color: 'purple',
        comment: 'Product customer reviews',
        x: 840,
        y: 380,
        columns: [
          { id: 'c_rv1', name: 'id', type: 'BIGINT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_rv2', name: 'product_id', type: 'BIGINT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' },
          { id: 'c_rv3', name: 'customer_id', type: 'BIGINT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' },
          { id: 'c_rv4', name: 'rating', type: 'INT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '5', comment: '1-5 stars' },
          { id: 'c_rv5', name: 'comment', type: 'TEXT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: true, defaultValue: '', comment: '' }
        ]
      }
    ],
    relationships: [
      { id: 'r_ec1', sourceTableId: 't_customers', sourceColumnId: 'c_c1', targetTableId: 't_orders', targetColumnId: 'c_o2', cardinality: '1:N', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { id: 'r_ec2', sourceTableId: 't_categories', sourceColumnId: 'c_ec_cat1', targetTableId: 't_products', targetColumnId: 'c_pr2', cardinality: '1:N', onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { id: 'r_ec3', sourceTableId: 't_orders', sourceColumnId: 'c_o1', targetTableId: 't_order_items', targetColumnId: 'c_oi2', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { id: 'r_ec4', sourceTableId: 't_products', sourceColumnId: 'c_pr1', targetTableId: 't_order_items', targetColumnId: 'c_oi3', cardinality: '1:N', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { id: 'r_ec5', sourceTableId: 't_orders', sourceColumnId: 'c_o1', targetTableId: 't_payments', targetColumnId: 'c_pay2', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { id: 'r_ec6', sourceTableId: 't_products', sourceColumnId: 'c_pr1', targetTableId: 't_reviews', targetColumnId: 'c_rv2', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { id: 'r_ec7', sourceTableId: 't_customers', sourceColumnId: 'c_c1', targetTableId: 't_reviews', targetColumnId: 'c_rv3', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' }
    ]
  },
  school: {
    name: 'School Management',
    tables: [
      {
        id: 't_students',
        name: 'students',
        color: 'sky',
        comment: 'Enrolled students',
        x: 80,
        y: 80,
        columns: [
          { id: 'c_s1', name: 'id', type: 'INT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_s2', name: 'student_number', type: 'VARCHAR', length: '30', isPk: false, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_s3', name: 'full_name', type: 'VARCHAR', length: '120', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_s4', name: 'enrollment_date', type: 'DATE', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' }
        ]
      },
      {
        id: 't_teachers',
        name: 'teachers',
        color: 'emerald',
        comment: 'Faculty & instructors',
        x: 480,
        y: 80,
        columns: [
          { id: 'c_t1', name: 'id', type: 'INT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_t2', name: 'full_name', type: 'VARCHAR', length: '120', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_t3', name: 'department', type: 'VARCHAR', length: '80', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' }
        ]
      },
      {
        id: 't_courses',
        name: 'courses',
        color: 'indigo',
        comment: 'Academic courses',
        x: 480,
        y: 350,
        columns: [
          { id: 'c_cr1', name: 'id', type: 'INT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_cr2', name: 'teacher_id', type: 'INT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: true, defaultValue: '', comment: 'Instructor FK' },
          { id: 'c_cr3', name: 'course_code', type: 'VARCHAR', length: '20', isPk: false, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_cr4', name: 'credits', type: 'INT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '3', comment: '' }
        ]
      },
      {
        id: 't_enrollments',
        name: 'enrollments',
        color: 'amber',
        comment: 'Student course enrollments',
        x: 80,
        y: 350,
        columns: [
          { id: 'c_en1', name: 'id', type: 'INT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_en2', name: 'student_id', type: 'INT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' },
          { id: 'c_en3', name: 'course_id', type: 'INT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' },
          { id: 'c_en4', name: 'enrolled_on', type: 'DATE', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' }
        ]
      },
      {
        id: 't_grades',
        name: 'grades',
        color: 'rose',
        comment: 'Assessment scores and letter grades',
        x: 80,
        y: 620,
        columns: [
          { id: 'c_g1', name: 'id', type: 'INT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_g2', name: 'enrollment_id', type: 'INT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' },
          { id: 'c_g3', name: 'score', type: 'DECIMAL', length: '5,2', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '0.00', comment: '' },
          { id: 'c_g4', name: 'letter_grade', type: 'VARCHAR', length: '4', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: true, defaultValue: '', comment: '' }
        ]
      },
      {
        id: 't_classrooms',
        name: 'classrooms',
        color: 'teal',
        comment: 'Campus rooms & capacities',
        x: 840,
        y: 350,
        columns: [
          { id: 'c_cl1', name: 'id', type: 'INT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_cl2', name: 'building', type: 'VARCHAR', length: '50', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_cl3', name: 'room_number', type: 'VARCHAR', length: '20', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_cl4', name: 'capacity', type: 'INT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '30', comment: '' }
        ]
      },
      {
        id: 't_attendance',
        name: 'attendance',
        color: 'slate',
        comment: 'Daily attendance logs',
        x: 480,
        y: 620,
        columns: [
          { id: 'c_at1', name: 'id', type: 'INT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_at2', name: 'student_id', type: 'INT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' },
          { id: 'c_at3', name: 'date', type: 'DATE', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_at4', name: 'status', type: 'VARCHAR', length: '20', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: "'present'", comment: '' }
        ]
      }
    ],
    relationships: [
      { id: 'r_sc1', sourceTableId: 't_teachers', sourceColumnId: 'c_t1', targetTableId: 't_courses', targetColumnId: 'c_cr2', cardinality: '1:N', onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { id: 'r_sc2', sourceTableId: 't_students', sourceColumnId: 'c_s1', targetTableId: 't_enrollments', targetColumnId: 'c_en2', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { id: 'r_sc3', sourceTableId: 't_courses', sourceColumnId: 'c_cr1', targetTableId: 't_enrollments', targetColumnId: 'c_en3', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { id: 'r_sc4', sourceTableId: 't_enrollments', sourceColumnId: 'c_en1', targetTableId: 't_grades', targetColumnId: 'c_g2', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { id: 'r_sc5', sourceTableId: 't_students', sourceColumnId: 'c_s1', targetTableId: 't_attendance', targetColumnId: 'c_at2', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' }
    ]
  },
  saas: {
    name: 'SaaS Multi-Tenancy',
    tables: [
      {
        id: 't_tenants',
        name: 'tenants',
        color: 'indigo',
        comment: 'Company accounts & organizations',
        x: 80,
        y: 80,
        columns: [
          { id: 'c_t_1', name: 'id', type: 'UUID', length: '', isPk: true, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: 'uuid_generate_v4()', comment: '' },
          { id: 'c_t_2', name: 'name', type: 'VARCHAR', length: '120', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_t_3', name: 'slug', type: 'VARCHAR', length: '60', isPk: false, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: 'Subdomain' },
          { id: 'c_t_4', name: 'created_at', type: 'TIMESTAMP', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', comment: '' }
        ]
      },
      {
        id: 't_plans',
        name: 'plans',
        color: 'emerald',
        comment: 'Subscription tiers & quotas',
        x: 480,
        y: 80,
        columns: [
          { id: 'c_pl_1', name: 'id', type: 'VARCHAR', length: '50', isPk: true, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: 'e.g. starter, pro' },
          { id: 'c_pl_2', name: 'name', type: 'VARCHAR', length: '100', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_pl_3', name: 'monthly_price', type: 'DECIMAL', length: '10,2', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '0.00', comment: '' },
          { id: 'c_pl_4', name: 'seat_limit', type: 'INT', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '5', comment: '' }
        ]
      },
      {
        id: 't_subscriptions',
        name: 'subscriptions',
        color: 'sky',
        comment: 'Active tenant subscriptions',
        x: 480,
        y: 350,
        columns: [
          { id: 'c_sub_1', name: 'id', type: 'UUID', length: '', isPk: true, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_sub_2', name: 'tenant_id', type: 'UUID', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' },
          { id: 'c_sub_3', name: 'plan_id', type: 'VARCHAR', length: '50', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' },
          { id: 'c_sub_4', name: 'status', type: 'VARCHAR', length: '30', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: "'active'", comment: '' },
          { id: 'c_sub_5', name: 'renews_at', type: 'TIMESTAMP', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' }
        ]
      },
      {
        id: 't_users',
        name: 'users',
        color: 'purple',
        comment: 'User accounts across tenants',
        x: 80,
        y: 350,
        columns: [
          { id: 'c_su_1', name: 'id', type: 'UUID', length: '', isPk: true, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_su_2', name: 'tenant_id', type: 'UUID', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' },
          { id: 'c_su_3', name: 'email', type: 'VARCHAR', length: '255', isPk: false, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_su_4', name: 'role', type: 'VARCHAR', length: '30', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: "'member'", comment: '' }
        ]
      },
      {
        id: 't_teams',
        name: 'teams',
        color: 'teal',
        comment: 'Sub-teams within organizations',
        x: 840,
        y: 80,
        columns: [
          { id: 'c_tm_1', name: 'id', type: 'UUID', length: '', isPk: true, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_tm_2', name: 'tenant_id', type: 'UUID', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' },
          { id: 'c_tm_3', name: 'name', type: 'VARCHAR', length: '80', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' }
        ]
      },
      {
        id: 't_team_members',
        name: 'team_members',
        color: 'slate',
        comment: 'Team memberships',
        x: 840,
        y: 350,
        columns: [
          { id: 'c_tmm_1', name: 'team_id', type: 'UUID', length: '', isPk: true, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' },
          { id: 'c_tmm_2', name: 'user_id', type: 'UUID', length: '', isPk: true, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' }
        ]
      },
      {
        id: 't_api_keys',
        name: 'api_keys',
        color: 'amber',
        comment: 'Tenant developer API keys',
        x: 80,
        y: 650,
        columns: [
          { id: 'c_ak_1', name: 'id', type: 'UUID', length: '', isPk: true, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_ak_2', name: 'tenant_id', type: 'UUID', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' },
          { id: 'c_ak_3', name: 'name', type: 'VARCHAR', length: '80', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_ak_4', name: 'key_hash', type: 'VARCHAR', length: '255', isPk: false, isAutoIncrement: false, isUnique: true, isNullable: false, defaultValue: '', comment: '' }
        ]
      },
      {
        id: 't_audit_logs',
        name: 'audit_logs',
        color: 'rose',
        comment: 'Immutable compliance audit trail',
        x: 480,
        y: 650,
        columns: [
          { id: 'c_al_1', name: 'id', type: 'BIGINT', length: '', isPk: true, isAutoIncrement: true, isUnique: true, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_al_2', name: 'tenant_id', type: 'UUID', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: 'FK' },
          { id: 'c_al_3', name: 'user_id', type: 'UUID', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: true, defaultValue: '', comment: 'FK' },
          { id: 'c_al_4', name: 'action', type: 'VARCHAR', length: '100', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: '', comment: '' },
          { id: 'c_al_5', name: 'created_at', type: 'TIMESTAMP', length: '', isPk: false, isAutoIncrement: false, isUnique: false, isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', comment: '' }
        ]
      }
    ],
    relationships: [
      { id: 'r_saas_1', sourceTableId: 't_tenants', sourceColumnId: 'c_t_1', targetTableId: 't_subscriptions', targetColumnId: 'c_sub_2', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { id: 'r_saas_2', sourceTableId: 't_plans', sourceColumnId: 'c_pl_1', targetTableId: 't_subscriptions', targetColumnId: 'c_sub_3', cardinality: '1:N', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { id: 'r_saas_3', sourceTableId: 't_tenants', sourceColumnId: 'c_t_1', targetTableId: 't_users', targetColumnId: 'c_su_2', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { id: 'r_saas_4', sourceTableId: 't_tenants', sourceColumnId: 'c_t_1', targetTableId: 't_teams', targetColumnId: 'c_tm_2', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { id: 'r_saas_5', sourceTableId: 't_teams', sourceColumnId: 'c_tm_1', targetTableId: 't_team_members', targetColumnId: 'c_tmm_1', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { id: 'r_saas_6', sourceTableId: 't_users', sourceColumnId: 'c_su_1', targetTableId: 't_team_members', targetColumnId: 'c_tmm_2', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { id: 'r_saas_7', sourceTableId: 't_tenants', sourceColumnId: 'c_t_1', targetTableId: 't_api_keys', targetColumnId: 'c_ak_2', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { id: 'r_saas_8', sourceTableId: 't_tenants', sourceColumnId: 'c_t_1', targetTableId: 't_audit_logs', targetColumnId: 'c_al_2', cardinality: '1:N', onDelete: 'CASCADE', onUpdate: 'CASCADE' }
    ]
  }
};

class Store {
  constructor() {
    this.state = {
      theme: 'dark',
      dialect: 'postgresql',
      snapToGrid: false,
      gridSize: 20,
      showMinimap: true,
      currentProjectId: 'default',
      projects: [
        {
          id: 'default',
          name: 'E-Commerce Core',
          tables: JSON.parse(JSON.stringify(STARTER_TEMPLATES.ecommerce.tables)),
          relationships: JSON.parse(JSON.stringify(STARTER_TEMPLATES.ecommerce.relationships)),
          updatedAt: Date.now()
        }
      ],
      viewport: {
        x: 40,
        y: 40,
        scale: 1.0
      },
      selectedTableIds: [],
      selectedRelationshipId: null,
      activeEditorTableId: null,
      isConnecting: false,
      connectionSource: null, // { tableId, columnId, side }
      connectingCursor: { x: 0, y: 0 },
      hoveredTableId: null,
      marquee: null
    };

    this.listeners = new Set();
    this.initFromStorage();
  }

  get currentProject() {
    let p = this.state.projects.find(proj => proj.id === this.state.currentProjectId);
    if (!p) {
      p = this.state.projects[0];
      this.state.currentProjectId = p.id;
    }
    return p;
  }

  get tables() {
    return this.currentProject.tables;
  }

  get relationships() {
    return this.currentProject.relationships;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event, payload) {
    for (const listener of this.listeners) {
      listener(event, payload, this.state);
    }
  }

  initFromStorage() {
    try {
      const storedTheme = localStorage.getItem('schemaforge_theme');
      if (storedTheme) this.state.theme = storedTheme;
      else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        this.state.theme = 'light';
      }

      const storedDialect = localStorage.getItem('schemaforge_dialect');
      if (storedDialect) this.state.dialect = storedDialect;

      const storedSnap = localStorage.getItem('schemaforge_snap');
      if (storedSnap !== null) this.state.snapToGrid = storedSnap === 'true';

      const storedProjects = localStorage.getItem('schemaforge_projects');
      if (storedProjects) {
        const parsed = JSON.parse(storedProjects);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.state.projects = parsed;
        }
      }

      const storedCur = localStorage.getItem('schemaforge_current_project');
      if (storedCur && this.state.projects.some(p => p.id === storedCur)) {
        this.state.currentProjectId = storedCur;
      }
    } catch (e) {
      console.warn('Storage restore error:', e);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('schemaforge_theme', this.state.theme);
      localStorage.setItem('schemaforge_dialect', this.state.dialect);
      localStorage.setItem('schemaforge_snap', String(this.state.snapToGrid));
      localStorage.setItem('schemaforge_current_project', this.state.currentProjectId);
      localStorage.setItem('schemaforge_projects', JSON.stringify(this.state.projects));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }
}

const store = new Store();

// =============================================================================
// 2. HISTORY (UNDO / REDO)
// =============================================================================
class HistoryManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.maxSize = 60;
    this.isApplying = false;
  }

  snapshot() {
    if (this.isApplying) return;
    const project = store.currentProject;
    const snap = {
      tables: JSON.parse(JSON.stringify(project.tables)),
      relationships: JSON.parse(JSON.stringify(project.relationships)),
      selectedTableIds: [...store.state.selectedTableIds]
    };

    this.undoStack.push(snap);
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.updateButtons();
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const project = store.currentProject;
    const currentSnap = {
      tables: JSON.parse(JSON.stringify(project.tables)),
      relationships: JSON.parse(JSON.stringify(project.relationships)),
      selectedTableIds: [...store.state.selectedTableIds]
    };
    this.redoStack.push(currentSnap);

    const prev = this.undoStack.pop();
    this.isApplying = true;
    project.tables = prev.tables;
    project.relationships = prev.relationships;
    store.state.selectedTableIds = prev.selectedTableIds || [];
    this.isApplying = false;

    this.updateButtons();
    store.saveToStorage();
    store.notify('history_change');
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const project = store.currentProject;
    const currentSnap = {
      tables: JSON.parse(JSON.stringify(project.tables)),
      relationships: JSON.parse(JSON.stringify(project.relationships)),
      selectedTableIds: [...store.state.selectedTableIds]
    };
    this.undoStack.push(currentSnap);

    const next = this.redoStack.pop();
    this.isApplying = true;
    project.tables = next.tables;
    project.relationships = next.relationships;
    store.state.selectedTableIds = next.selectedTableIds || [];
    this.isApplying = false;

    this.updateButtons();
    store.saveToStorage();
    store.notify('history_change');
  }

  updateButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const mobileUndo = document.getElementById('mobile-undo-btn');
    const mobileRedo = document.getElementById('mobile-redo-btn');

    const canUndo = this.undoStack.length > 0;
    const canRedo = this.redoStack.length > 0;

    if (undoBtn) undoBtn.disabled = !canUndo;
    if (redoBtn) redoBtn.disabled = !canRedo;
    if (mobileUndo) mobileUndo.style.opacity = canUndo ? '1' : '0.4';
    if (mobileRedo) mobileRedo.style.opacity = canRedo ? '1' : '0.4';
  }
}

const history = new HistoryManager();

// =============================================================================
// 3. CANVAS AND VIEWPORT (PAN, ZOOM, MINIMAP, MARQUEE, RAF)
// =============================================================================
class CanvasManager {
  constructor() {
    this.viewportEl = document.getElementById('canvas-viewport');
    this.containerEl = document.getElementById('canvas-container');
    this.zoomLabelEl = document.getElementById('zoom-label');
    this.marqueeEl = document.getElementById('selection-marquee');
    this.minimapContainerEl = document.getElementById('minimap-container');
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapViewport = document.getElementById('minimap-viewport');

    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.viewStart = { x: 0, y: 0 };
    this.isSpaceHeld = false;
    this.isMarqueeActive = false;
    this.marqueeStart = { x: 0, y: 0 };

    this.touches = [];
    this.initialPinchDistance = 0;
    this.initialPinchScale = 1;

    this.rafScheduled = false;

    this.setupEvents();
    this.applyTransform();
  }

  setupEvents() {
    // Mouse Pan & Zoom
    this.viewportEl.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));

    // Mouse Wheel Zoom
    this.viewportEl.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    // Touch events for mobile pan & pinch-zoom
    this.viewportEl.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.viewportEl.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.viewportEl.addEventListener('touchend', (e) => this.onTouchEnd(e));
    this.viewportEl.addEventListener('touchcancel', (e) => this.onTouchEnd(e));

    // Spacebar to pan
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        this.isSpaceHeld = true;
        this.viewportEl.style.cursor = 'grab';
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isSpaceHeld = false;
        if (!this.isPanning) {
          this.viewportEl.style.cursor = '';
        }
      }
    });

    // Minimap click to jump
    if (this.minimapContainerEl) {
      this.minimapContainerEl.addEventListener('mousedown', (e) => this.onMinimapClick(e));
    }

    // Double click to create table
    this.viewportEl.addEventListener('dblclick', (e) => {
      if (e.target === this.viewportEl || e.target === this.containerEl || e.target.id === 'relationships-svg') {
        const pt = this.screenToCanvas(e.clientX, e.clientY);
        tableManager.createNewTable(pt.x - 135, pt.y - 40);
      }
    });
  }

  screenToCanvas(screenX, screenY) {
    const rect = this.viewportEl.getBoundingClientRect();
    const vp = store.state.viewport;
    return {
      x: (screenX - rect.left - vp.x) / vp.scale,
      y: (screenY - rect.top - vp.y) / vp.scale
    };
  }

  canvasToScreen(canvasX, canvasY) {
    const rect = this.viewportEl.getBoundingClientRect();
    const vp = store.state.viewport;
    return {
      x: canvasX * vp.scale + vp.x + rect.left,
      y: canvasY * vp.scale + vp.y + rect.top
    };
  }

  onMouseDown(e) {
    // Only handle if clicking empty canvas
    const isCanvasBg = e.target === this.viewportEl || e.target === this.containerEl || e.target.id === 'relationships-svg' || e.target.tagName === 'svg';
    if (!isCanvasBg) return;

    if (e.button === 1 || this.isSpaceHeld || (!e.shiftKey && e.button === 0 && !e.altKey)) {
      // If holding shift, start marquee; otherwise, if on canvas background, click or pan
      if (e.shiftKey) {
        this.startMarquee(e.clientX, e.clientY);
      } else {
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.viewStart = { x: store.state.viewport.x, y: store.state.viewport.y };
        this.viewportEl.classList.add('is-panning');

        // Deselect if regular click on empty space
        if (store.state.selectedTableIds.length > 0 || store.state.selectedRelationshipId) {
          store.state.selectedTableIds = [];
          store.state.selectedRelationshipId = null;
          panelManager.closeEditor();
          tableManager.renderSelectedStates();
          relationshipManager.renderLines();
        }
      }
    }
  }

  onMouseMove(e) {
    if (this.isPanning) {
      const dx = e.clientX - this.panStart.x;
      const dy = e.clientY - this.panStart.y;
      store.state.viewport.x = this.viewStart.x + dx;
      store.state.viewport.y = this.viewStart.y + dy;
      this.scheduleTransform();
      return;
    }

    if (this.isMarqueeActive) {
      this.updateMarquee(e.clientX, e.clientY);
      return;
    }

    if (store.state.isConnecting) {
      const pt = this.screenToCanvas(e.clientX, e.clientY);
      store.state.connectingCursor = pt;
      relationshipManager.renderPreviewLine();
    }
  }

  onMouseUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.viewportEl.classList.remove('is-panning');
      this.viewportEl.style.cursor = this.isSpaceHeld ? 'grab' : '';
    }

    if (this.isMarqueeActive) {
      this.endMarquee();
    }

    if (store.state.isConnecting) {
      // Drag dropped on nothing
      relationshipManager.cancelConnection();
    }
  }

  onWheel(e) {
    e.preventDefault();
    const rect = this.viewportEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    this.zoomAtPoint(mouseX, mouseY, zoomFactor);
  }

  zoomAtPoint(screenX, screenY, factor) {
    const vp = store.state.viewport;
    const oldScale = vp.scale;
    const newScale = clamp(oldScale * factor, 0.25, 2.0);

    if (newScale === oldScale) return;

    vp.x = screenX - (screenX - vp.x) * (newScale / oldScale);
    vp.y = screenY - (screenY - vp.y) * (newScale / oldScale);
    vp.scale = newScale;

    this.scheduleTransform();
  }

  onTouchStart(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const isCanvasBg = touch.target === this.viewportEl || touch.target === this.containerEl || touch.target.id === 'relationships-svg';
      if (isCanvasBg) {
        this.isPanning = true;
        this.panStart = { x: touch.clientX, y: touch.clientY };
        this.viewStart = { x: store.state.viewport.x, y: store.state.viewport.y };
      }
    } else if (e.touches.length === 2) {
      // Pinch to zoom
      this.isPanning = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      this.initialPinchDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      this.initialPinchScale = store.state.viewport.scale;
    }
  }

  onTouchMove(e) {
    if (e.touches.length === 1 && this.isPanning) {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - this.panStart.x;
      const dy = touch.clientY - this.panStart.y;
      store.state.viewport.x = this.viewStart.x + dx;
      store.state.viewport.y = this.viewStart.y + dy;
      this.scheduleTransform();
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      if (this.initialPinchDistance > 0) {
        const factor = dist / this.initialPinchDistance;
        const rect = this.viewportEl.getBoundingClientRect();
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top;

        const newScale = clamp(this.initialPinchScale * factor, 0.25, 2.0);
        const oldScale = store.state.viewport.scale;
        store.state.viewport.x = midX - (midX - store.state.viewport.x) * (newScale / oldScale);
        store.state.viewport.y = midY - (midY - store.state.viewport.y) * (newScale / oldScale);
        store.state.viewport.scale = newScale;
        this.scheduleTransform();
      }
    }
  }

  onTouchEnd(e) {
    if (e.touches.length === 0) {
      this.isPanning = false;
    }
  }

  startMarquee(clientX, clientY) {
    this.isMarqueeActive = true;
    this.marqueeStart = { x: clientX, y: clientY };
    this.marqueeEl.style.display = 'block';
    this.marqueeEl.style.left = `${clientX}px`;
    this.marqueeEl.style.top = `${clientY}px`;
    this.marqueeEl.style.width = '0px';
    this.marqueeEl.style.height = '0px';
  }

  updateMarquee(clientX, clientY) {
    const x = Math.min(clientX, this.marqueeStart.x);
    const y = Math.min(clientY, this.marqueeStart.y);
    const width = Math.abs(clientX - this.marqueeStart.x);
    const height = Math.abs(clientY - this.marqueeStart.y);

    this.marqueeEl.style.left = `${x}px`;
    this.marqueeEl.style.top = `${y}px`;
    this.marqueeEl.style.width = `${width}px`;
    this.marqueeEl.style.height = `${height}px`;

    // Intersect tables
    const rect = this.viewportEl.getBoundingClientRect();
    const boxLeft = (x - rect.left - store.state.viewport.x) / store.state.viewport.scale;
    const boxTop = (y - rect.top - store.state.viewport.y) / store.state.viewport.scale;
    const boxRight = boxLeft + width / store.state.viewport.scale;
    const boxBottom = boxTop + height / store.state.viewport.scale;

    const selected = [];
    for (const table of store.tables) {
      const tableRight = table.x + 270;
      const tableBottom = table.y + 40 + table.columns.length * 30;
      if (table.x < boxRight && tableRight > boxLeft && table.y < boxBottom && tableBottom > boxTop) {
        selected.push(table.id);
      }
    }
    store.state.selectedTableIds = selected;
    tableManager.renderSelectedStates();
  }

  endMarquee() {
    this.isMarqueeActive = false;
    this.marqueeEl.style.display = 'none';
  }

  scheduleTransform() {
    if (this.rafScheduled) return;
    this.rafScheduled = true;
    requestAnimationFrame(() => {
      this.applyTransform();
      this.rafScheduled = false;
    });
  }

  applyTransform() {
    const vp = store.state.viewport;
    this.containerEl.style.transform = `translate(${vp.x}px, ${vp.y}px) scale(${vp.scale})`;
    this.zoomLabelEl.textContent = `${Math.round(vp.scale * 100)}%`;
    this.viewportEl.style.backgroundPosition = `${vp.x}px ${vp.y}px`;
    this.viewportEl.style.backgroundSize = `${24 * vp.scale}px ${24 * vp.scale}px`;
    this.renderMinimap();
  }

  fitToScreen() {
    const tables = store.tables;
    if (tables.length === 0) {
      store.state.viewport = { x: 40, y: 40, scale: 1.0 };
      this.scheduleTransform();
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of tables) {
      const h = 40 + t.columns.length * 30;
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + 270);
      maxY = Math.max(maxY, t.y + h);
    }

    const padding = 80;
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const viewW = this.viewportEl.clientWidth;
    const viewH = this.viewportEl.clientHeight;

    const scaleX = (viewW - padding * 2) / contentW;
    const scaleY = (viewH - padding * 2) / contentH;
    const targetScale = clamp(Math.min(scaleX, scaleY), 0.35, 1.3);

    store.state.viewport.scale = targetScale;
    store.state.viewport.x = (viewW - contentW * targetScale) / 2 - minX * targetScale;
    store.state.viewport.y = (viewH - contentH * targetScale) / 2 - minY * targetScale;

    this.scheduleTransform();
  }

  renderMinimap() {
    if (!store.state.showMinimap || !this.minimapCanvas) return;
    const ctx = this.minimapCanvas.getContext('2d');
    const w = (this.minimapCanvas.width = 180);
    const h = (this.minimapCanvas.height = 120);

    ctx.clearRect(0, 0, w, h);

    const tables = store.tables;
    if (tables.length === 0) return;

    // Determine bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of tables) {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + 270);
      maxY = Math.max(maxY, t.y + 40 + t.columns.length * 30);
    }

    // Include current viewport area in bounds
    const vp = store.state.viewport;
    const vpLeft = -vp.x / vp.scale;
    const vpTop = -vp.y / vp.scale;
    const vpRight = vpLeft + this.viewportEl.clientWidth / vp.scale;
    const vpBottom = vpTop + this.viewportEl.clientHeight / vp.scale;

    minX = Math.min(minX, vpLeft) - 100;
    minY = Math.min(minY, vpTop) - 100;
    maxX = Math.max(maxX, vpRight) + 100;
    maxY = Math.max(maxY, vpBottom) + 100;

    const mapScale = Math.min(w / (maxX - minX), h / (maxY - minY));

    // Draw tables
    for (const t of tables) {
      const tx = (t.x - minX) * mapScale;
      const ty = (t.y - minY) * mapScale;
      const tw = 270 * mapScale;
      const th = (40 + t.columns.length * 30) * mapScale;

      ctx.fillStyle = store.state.theme === 'light' ? '#cbd5e1' : '#334155';
      ctx.fillRect(tx, ty, Math.max(tw, 2), Math.max(th, 2));

      // Header strip
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(tx, ty, Math.max(tw, 2), Math.max(3, th * 0.2));
    }

    // Viewport box
    const vx = (vpLeft - minX) * mapScale;
    const vy = (vpTop - minY) * mapScale;
    const vw = (vpRight - vpLeft) * mapScale;
    const vh = (vpBottom - vpTop) * mapScale;

    this.minimapViewport.style.left = `${vx}px`;
    this.minimapViewport.style.top = `${vy}px`;
    this.minimapViewport.style.width = `${vw}px`;
    this.minimapViewport.style.height = `${vh}px`;

    this._minimapBounds = { minX, minY, mapScale };
  }

  onMinimapClick(e) {
    if (!this._minimapBounds) return;
    const rect = this.minimapContainerEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const { minX, minY, mapScale } = this._minimapBounds;
    const targetCanvasX = minX + clickX / mapScale;
    const targetCanvasY = minY + clickY / mapScale;

    const vp = store.state.viewport;
    vp.x = this.viewportEl.clientWidth / 2 - targetCanvasX * vp.scale;
    vp.y = this.viewportEl.clientHeight / 2 - targetCanvasY * vp.scale;

    this.scheduleTransform();
  }
}

// =============================================================================
// 4. TABLES AND COLUMNS
// =============================================================================
class TableManager {
  constructor() {
    this.container = document.getElementById('tables-container');
    this.draggedTable = null;
    this.dragOffset = { x: 0, y: 0 };
    this.initialPositions = new Map();
    this.hasMoved = false;

    this.setupEvents();
  }

  setupEvents() {
    window.addEventListener('mousemove', (e) => this.onDragMove(e));
    window.addEventListener('mouseup', () => this.onDragEnd());

    window.addEventListener('touchmove', (e) => {
      if (this.draggedTable && e.touches.length === 1) {
        this.onDragMove(e.touches[0]);
      }
    }, { passive: false });

    window.addEventListener('touchend', () => {
      if (this.draggedTable) this.onDragEnd();
    });
  }

  renderAll() {
    this.container.innerHTML = '';
    const tables = store.tables;

    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
      if (tables.length === 0) {
        emptyState.classList.remove('is-hidden');
      } else {
        emptyState.classList.add('is-hidden');
      }
    }

    for (const table of tables) {
      const card = this.createTableElement(table);
      this.container.appendChild(card);
    }

    this.renderSelectedStates();
    canvasManager.scheduleTransform();
    relationshipManager.renderLines();
    healthManager.checkHealth();
  }

  createTableElement(table) {
    const card = document.createElement('div');
    card.className = `table-card ${table.id}`;
    card.id = `table-card-${table.id}`;
    card.dataset.tableId = table.id;
    card.style.transform = `translate3d(${table.x}px, ${table.y}px, 0)`;

    // Table Header
    const header = document.createElement('div');
    header.className = `table-header palette-${table.color || 'indigo'}`;
    header.innerHTML = `
      <div class="table-title-wrap">
        <span class="table-title" title="Double click to edit name">${escapeHtml(table.name)}</span>
      </div>
      <span class="table-column-count">${table.columns.length}</span>
    `;

    // Inline title edit on double click
    const titleSpan = header.querySelector('.table-title');
    titleSpan.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.startInlineRename(table, titleSpan);
    });

    card.appendChild(header);

    // Columns Body
    const columnsBody = document.createElement('div');
    columnsBody.className = 'table-columns';

    for (const col of table.columns) {
      const row = document.createElement('div');
      row.className = `table-row ${col.isPk ? 'is-pk' : ''}`;
      row.dataset.columnId = col.id;

      // Badges
      let badgeHtml = '';
      if (col.isPk) {
        badgeHtml = `<span class="col-badge col-badge-pk" title="Primary Key">🔑</span>`;
      } else if (this.isForeignKey(table.id, col.id)) {
        badgeHtml = `<span class="col-badge col-badge-fk" title="Foreign Key">🔗</span>`;
      } else if (col.isUnique) {
        badgeHtml = `<span class="col-badge col-badge-uq" title="Unique">✨</span>`;
      } else {
        badgeHtml = `<span class="col-badge" style="opacity:0.3">·</span>`;
      }

      const nullMarker = col.isNullable ? '<span class="col-null-marker">NULL</span>' : '';

      row.innerHTML = `
        <div class="connector-dot left" data-table-id="${table.id}" data-column-id="${col.id}" data-side="left" title="Connect relation"></div>
        <div class="table-row-left">
          ${badgeHtml}
          <span class="col-name" title="${escapeHtml(col.name)}">${escapeHtml(col.name)}</span>
        </div>
        <div class="table-row-right">
          <span class="col-type">${escapeHtml(col.type)}${col.length ? `(${escapeHtml(col.length)})` : ''}</span>
          ${nullMarker}
        </div>
        <div class="connector-dot right" data-table-id="${table.id}" data-column-id="${col.id}" data-side="right" title="Connect relation"></div>
      `;

      columnsBody.appendChild(row);
    }

    card.appendChild(columnsBody);

    // Optional table comment footer
    if (table.comment) {
      const footer = document.createElement('div');
      footer.className = 'table-comment-footer';
      footer.title = table.comment;
      footer.textContent = table.comment;
      card.appendChild(footer);
    }

    // Attach card event listeners
    this.attachCardEvents(card, table);

    return card;
  }

  isForeignKey(tableId, columnId) {
    return store.relationships.some(
      r => (r.sourceTableId === tableId && r.sourceColumnId === columnId) ||
           (r.targetTableId === tableId && r.targetColumnId === columnId)
    );
  }

  attachCardEvents(card, table) {
    // Selection and Drag start
    card.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('connector-dot')) return;
      if (e.target.tagName === 'INPUT') return;

      if (e.button === 0) {
        if (e.shiftKey) {
          // Toggle selection
          if (store.state.selectedTableIds.includes(table.id)) {
            store.state.selectedTableIds = store.state.selectedTableIds.filter(id => id !== table.id);
          } else {
            store.state.selectedTableIds.push(table.id);
          }
        } else {
          // Select single if not already selected
          if (!store.state.selectedTableIds.includes(table.id)) {
            store.state.selectedTableIds = [table.id];
          }
        }

        this.renderSelectedStates();
        panelManager.openEditor(table.id);

        // Prepare Dragging
        this.startDrag(e.clientX, e.clientY, table);
      }
    });

    // Mobile touch drag & tap
    card.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1 && !e.target.classList.contains('connector-dot')) {
        const touch = e.touches[0];
        if (!store.state.selectedTableIds.includes(table.id)) {
          store.state.selectedTableIds = [table.id];
        }
        this.renderSelectedStates();
        panelManager.openEditor(table.id);
        this.startDrag(touch.clientX, touch.clientY, table);
      }
    });

    // Hover effect: highlight connected lines
    card.addEventListener('mouseenter', () => {
      store.state.hoveredTableId = table.id;
      relationshipManager.updateHoverHighlights();
    });

    card.addEventListener('mouseleave', () => {
      if (store.state.hoveredTableId === table.id) {
        store.state.hoveredTableId = null;
        relationshipManager.updateHoverHighlights();
      }
    });

    // Connector dot events
    const dots = card.querySelectorAll('.connector-dot');
    dots.forEach(dot => {
      dot.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const side = dot.dataset.side;
        relationshipManager.startConnection(table.id, dot.dataset.columnId, side, e.clientX, e.clientY);
      });

      dot.addEventListener('mouseup', (e) => {
        e.stopPropagation();
        if (store.state.isConnecting) {
          relationshipManager.finishConnection(table.id, dot.dataset.columnId);
        }
      });

      // Mobile touch for connector
      dot.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const touch = e.touches[0];
        if (!store.state.isConnecting) {
          relationshipManager.startConnection(table.id, dot.dataset.columnId, dot.dataset.side, touch.clientX, touch.clientY);
          showToast('Tap target column on another table to connect', 'info');
        } else {
          relationshipManager.finishConnection(table.id, dot.dataset.columnId);
        }
      });
    });

    // Allow clicking the entire column row to complete connection on mobile
    const rows = card.querySelectorAll('.table-row');
    rows.forEach(row => {
      row.addEventListener('click', (e) => {
        if (store.state.isConnecting) {
          relationshipManager.finishConnection(table.id, row.dataset.columnId);
        }
      });
    });
  }

  startDrag(clientX, clientY, activeTable) {
    this.draggedTable = activeTable;
    this.hasMoved = false;
    history.snapshot();

    this.dragOffset = canvasManager.screenToCanvas(clientX, clientY);
    this.initialPositions.clear();

    for (const tableId of store.state.selectedTableIds) {
      const t = store.tables.find(item => item.id === tableId);
      if (t) {
        this.initialPositions.set(tableId, { x: t.x, y: t.y });
      }
    }

    const cardEl = document.getElementById(`table-card-${activeTable.id}`);
    if (cardEl) cardEl.classList.add('is-dragging');
  }

  onDragMove(e) {
    if (!this.draggedTable) return;
    this.hasMoved = true;

    const currentCanvasPt = canvasManager.screenToCanvas(e.clientX, e.clientY);
    let dx = currentCanvasPt.x - this.dragOffset.x;
    let dy = currentCanvasPt.y - this.dragOffset.y;

    const gridSize = store.state.gridSize || 20;

    for (const [tableId, orig] of this.initialPositions.entries()) {
      const table = store.tables.find(t => t.id === tableId);
      if (!table) continue;

      let newX = orig.x + dx;
      let newY = orig.y + dy;

      if (store.state.snapToGrid) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }

      table.x = newX;
      table.y = newY;

      const card = document.getElementById(`table-card-${tableId}`);
      if (card) {
        card.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
      }
    }

    relationshipManager.renderLines();
  }

  onDragEnd() {
    if (!this.draggedTable) return;
    const cardEl = document.getElementById(`table-card-${this.draggedTable.id}`);
    if (cardEl) cardEl.classList.remove('is-dragging');

    if (this.hasMoved) {
      store.saveToStorage();
      canvasManager.renderMinimap();
    }
    this.draggedTable = null;
  }

  startInlineRename(table, titleSpan) {
    const originalName = table.name;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'table-title-input';
    input.value = originalName;

    titleSpan.replaceWith(input);
    input.focus();
    input.select();

    const commit = () => {
      const newName = input.value.trim() || originalName;
      if (newName !== originalName) {
        history.snapshot();
        table.name = newName;
        store.saveToStorage();
      }
      this.renderAll();
      if (store.state.activeEditorTableId === table.id) {
        panelManager.openEditor(table.id);
      }
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') {
        input.value = originalName;
        commit();
      }
    });
  }

  renderSelectedStates() {
    const selectedIds = new Set(store.state.selectedTableIds);
    const cards = this.container.querySelectorAll('.table-card');
    cards.forEach(card => {
      const id = card.dataset.tableId;
      if (selectedIds.has(id)) {
        card.classList.add('is-selected');
      } else {
        card.classList.remove('is-selected');
      }
    });
  }

  createNewTable(x, y) {
    history.snapshot();
    const count = store.tables.length + 1;
    const color = PALETTE_COLORS[(count - 1) % PALETTE_COLORS.length];
    const newId = generateId('t');

    // Default position if not provided
    if (x === undefined || y === undefined) {
      const center = canvasManager.screenToCanvas(
        canvasManager.viewportEl.clientWidth / 2,
        canvasManager.viewportEl.clientHeight / 2
      );
      x = center.x - 135;
      y = center.y - 60;
    }

    if (store.state.snapToGrid) {
      x = Math.round(x / 20) * 20;
      y = Math.round(y / 20) * 20;
    }

    const newTable = {
      id: newId,
      name: `table_${count}`,
      color: color,
      comment: '',
      x: x,
      y: y,
      columns: [
        {
          id: generateId('col'),
          name: 'id',
          type: store.state.dialect === 'postgresql' ? 'BIGINT' : 'INT',
          length: '',
          isPk: true,
          isAutoIncrement: true,
          isUnique: true,
          isNullable: false,
          defaultValue: '',
          comment: ''
        },
        {
          id: generateId('col'),
          name: 'name',
          type: 'VARCHAR',
          length: '255',
          isPk: false,
          isAutoIncrement: false,
          isUnique: false,
          isNullable: false,
          defaultValue: '',
          comment: ''
        }
      ]
    };

    store.tables.push(newTable);
    store.state.selectedTableIds = [newId];
    store.saveToStorage();
    this.renderAll();
    panelManager.openEditor(newId);
    showToast(`Created table ${newTable.name}`);
  }

  duplicateTable(tableId) {
    const source = store.tables.find(t => t.id === tableId);
    if (!source) return;

    history.snapshot();
    const newId = generateId('t');
    const newTable = JSON.parse(JSON.stringify(source));
    newTable.id = newId;
    newTable.name = `${source.name}_copy`;
    newTable.x += 40;
    newTable.y += 40;

    // Regulate column IDs
    for (const c of newTable.columns) {
      c.id = generateId('col');
    }

    store.tables.push(newTable);
    store.state.selectedTableIds = [newId];
    store.saveToStorage();
    this.renderAll();
    panelManager.openEditor(newId);
    showToast(`Duplicated ${source.name}`);
  }

  deleteTable(tableId) {
    const t = store.tables.find(table => table.id === tableId);
    if (!t) return;

    history.snapshot();
    // Delete table and related relationships
    const project = store.currentProject;
    project.tables = project.tables.filter(table => table.id !== tableId);
    project.relationships = project.relationships.filter(
      r => r.sourceTableId !== tableId && r.targetTableId !== tableId
    );

    store.state.selectedTableIds = store.state.selectedTableIds.filter(id => id !== tableId);
    if (store.state.activeEditorTableId === tableId) {
      panelManager.closeEditor();
    }

    store.saveToStorage();
    this.renderAll();
    showToast(`Deleted table ${t.name}`);
  }
}

// =============================================================================
// 5. RELATIONSHIPS AND CROW'S FOOT LINES
// =============================================================================
class RelationshipManager {
  constructor() {
    this.svgGroup = document.getElementById('relationships-group');
    this.previewLine = document.getElementById('connection-preview');
    this.modalEl = document.getElementById('relation-modal');
    this.modalSummary = document.getElementById('relation-summary');
    this.modalWarning = document.getElementById('relation-type-warning');
    this.cardinalitySelect = document.getElementById('relation-cardinality');
    this.junctionBox = document.getElementById('junction-generator-box');
    this.junctionBtn = document.getElementById('auto-generate-junction-btn');
    this.onDeleteSelect = document.getElementById('relation-on-delete');
    this.onUpdateSelect = document.getElementById('relation-on-update');
    this.deleteBtn = document.getElementById('delete-relation-btn');
    this.saveBtn = document.getElementById('save-relation-btn');
    this.closeBtn = document.getElementById('relation-modal-close-btn');

    this.activeRelation = null;
    this.setupEvents();
  }

  setupEvents() {
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.closeModal());
    if (this.saveBtn) this.saveBtn.addEventListener('click', () => this.saveRelation());
    if (this.deleteBtn) this.deleteBtn.addEventListener('click', () => this.deleteRelation());

    if (this.cardinalitySelect) {
      this.cardinalitySelect.addEventListener('change', () => {
        if (this.cardinalitySelect.value === 'N:M') {
          this.junctionBox.style.display = 'block';
        } else {
          this.junctionBox.style.display = 'none';
        }
      });
    }

    if (this.junctionBtn) {
      this.junctionBtn.addEventListener('click', () => this.generateJunctionTable());
    }
  }

  startConnection(tableId, columnId, side, clientX, clientY) {
    store.state.isConnecting = true;
    store.state.connectionSource = { tableId, columnId, side };
    store.state.connectingCursor = canvasManager.screenToCanvas(clientX, clientY);

    canvasManager.viewportEl.classList.add('is-connecting');
    this.previewLine.style.display = 'block';
    this.renderPreviewLine();
  }

  renderPreviewLine() {
    if (!store.state.isConnecting || !store.state.connectionSource) return;
    const { tableId, columnId, side } = store.state.connectionSource;
    const startPt = this.getColumnAnchor(tableId, columnId, side);
    if (!startPt) return;

    const targetPt = store.state.connectingCursor;
    const d = this.calculateBezierPath(startPt, targetPt, side, 'right');
    this.previewLine.setAttribute('d', d);
  }

  finishConnection(targetTableId, targetColumnId) {
    if (!store.state.isConnecting) return;
    const src = store.state.connectionSource;
    this.cancelConnection();

    if (!src || src.tableId === targetTableId) {
      return; // Can't connect to same table in basic setup
    }

    // Check if relationship already exists
    const exists = store.relationships.some(
      r => (r.sourceTableId === src.tableId && r.sourceColumnId === src.columnId &&
            r.targetTableId === targetTableId && r.targetColumnId === targetColumnId) ||
           (r.sourceTableId === targetTableId && r.sourceColumnId === targetColumnId &&
            r.targetTableId === src.tableId && r.targetColumnId === src.columnId)
    );

    if (exists) {
      showToast('Relationship already exists', 'warning');
      return;
    }

    history.snapshot();
    const newRelation = {
      id: generateId('r'),
      sourceTableId: src.tableId,
      sourceColumnId: src.columnId,
      targetTableId: targetTableId,
      targetColumnId: targetColumnId,
      cardinality: '1:N',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    };

    store.relationships.push(newRelation);
    store.saveToStorage();
    this.renderLines();
    tableManager.renderAll();
    showToast('Relationship created');
  }

  cancelConnection() {
    store.state.isConnecting = false;
    store.state.connectionSource = null;
    canvasManager.viewportEl.classList.remove('is-connecting');
    if (this.previewLine) this.previewLine.style.display = 'none';
  }

  getColumnAnchor(tableId, columnId, forcedSide = null) {
    const table = store.tables.find(t => t.id === tableId);
    if (!table) return null;

    const colIndex = table.columns.findIndex(c => c.id === columnId);
    if (colIndex === -1) return null;

    const cardWidth = 270;
    const headerHeight = 40;
    const rowHeight = 30;

    const y = table.y + headerHeight + colIndex * rowHeight + rowHeight / 2;
    const side = forcedSide || 'right';
    const x = side === 'left' ? table.x : table.x + cardWidth;

    return { x, y, side };
  }

  calculateBezierPath(pt1, pt2, side1, side2) {
    const dx = Math.abs(pt2.x - pt1.x);
    const curvature = Math.max(dx * 0.5, 40);

    const cp1x = side1 === 'left' ? pt1.x - curvature : pt1.x + curvature;
    const cp1y = pt1.y;

    const cp2x = side2 === 'left' ? pt2.x - curvature : pt2.x + curvature;
    const cp2y = pt2.y;

    return `M ${pt1.x} ${pt1.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt2.x} ${pt2.y}`;
  }

  renderLines() {
    this.svgGroup.innerHTML = '';
    const relationships = store.relationships;

    for (const rel of relationships) {
      const sourceTable = store.tables.find(t => t.id === rel.sourceTableId);
      const targetTable = store.tables.find(t => t.id === rel.targetTableId);
      if (!sourceTable || !targetTable) continue;

      // Smart side determination based on table X positions
      let srcSide = 'right';
      let tgtSide = 'left';

      if (sourceTable.x + 270 < targetTable.x) {
        srcSide = 'right';
        tgtSide = 'left';
      } else if (sourceTable.x > targetTable.x + 270) {
        srcSide = 'left';
        tgtSide = 'right';
      } else {
        // Tables are overlapping vertically; pick sides minimizing horizontal distance
        srcSide = sourceTable.x > targetTable.x ? 'left' : 'right';
        tgtSide = sourceTable.x > targetTable.x ? 'right' : 'left';
      }

      const pt1 = this.getColumnAnchor(rel.sourceTableId, rel.sourceColumnId, srcSide);
      const pt2 = this.getColumnAnchor(rel.targetTableId, rel.targetColumnId, tgtSide);
      if (!pt1 || !pt2) continue;

      const pathData = this.calculateBezierPath(pt1, pt2, srcSide, tgtSide);

      // Check type compatibility
      const srcCol = sourceTable.columns.find(c => c.id === rel.sourceColumnId);
      const tgtCol = targetTable.columns.find(c => c.id === rel.targetColumnId);
      const isTypeMismatch = srcCol && tgtCol && !this.areTypesCompatible(srcCol.type, tgtCol.type);

      const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      wrap.setAttribute('class', `relationship-path-wrap ${isTypeMismatch ? 'is-invalid' : ''}`);
      wrap.dataset.relId = rel.id;

      // Invisible wider hit area for click
      const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hitPath.setAttribute('class', 'relationship-hitbox');
      hitPath.setAttribute('d', pathData);

      // Visible styled path
      const visPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      visPath.setAttribute('class', 'relationship-line');
      visPath.setAttribute('d', pathData);

      // Markers for Crow's Foot
      if (rel.cardinality === '1:N') {
        visPath.setAttribute('marker-start', 'url(#marker-one-start)');
        visPath.setAttribute('marker-end', 'url(#marker-many-end)');
      } else if (rel.cardinality === '1:1') {
        visPath.setAttribute('marker-start', 'url(#marker-one-start)');
        visPath.setAttribute('marker-end', 'url(#marker-one-end)');
      } else if (rel.cardinality === 'N:M') {
        visPath.setAttribute('marker-start', 'url(#marker-many-start)');
        visPath.setAttribute('marker-end', 'url(#marker-many-end)');
      }

      wrap.appendChild(hitPath);
      wrap.appendChild(visPath);

      // Path Click: open relationship editor
      wrap.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openModal(rel);
      });

      this.svgGroup.appendChild(wrap);
    }

    this.updateHoverHighlights();
  }

  areTypesCompatible(t1, t2) {
    if (!t1 || !t2) return true;
    const norm = t => t.toUpperCase().replace(/\(.*\)/, '').trim();
    const a = norm(t1);
    const b = norm(t2);
    if (a === b) return true;

    const intFamily = ['INT', 'BIGINT', 'SERIAL', 'BIGSERIAL', 'INTEGER', 'SMALLINT'];
    if (intFamily.includes(a) && intFamily.includes(b)) return true;

    const strFamily = ['VARCHAR', 'TEXT', 'CHAR'];
    if (strFamily.includes(a) && strFamily.includes(b)) return true;

    return false;
  }

  updateHoverHighlights() {
    const hoveredId = store.state.hoveredTableId;
    const paths = this.svgGroup.querySelectorAll('.relationship-path-wrap');

    if (!hoveredId) {
      paths.forEach(p => {
        p.classList.remove('is-dimmed');
        p.classList.remove('is-highlighted');
      });
      return;
    }

    paths.forEach(p => {
      const relId = p.dataset.relId;
      const rel = store.relationships.find(r => r.id === relId);
      if (rel && (rel.sourceTableId === hoveredId || rel.targetTableId === hoveredId)) {
        p.classList.add('is-highlighted');
        p.classList.remove('is-dimmed');
      } else {
        p.classList.remove('is-highlighted');
        p.classList.add('is-dimmed');
      }
    });
  }

  openModal(relation) {
    this.activeRelation = relation;
    const srcT = store.tables.find(t => t.id === relation.sourceTableId);
    const tgtT = store.tables.find(t => t.id === relation.targetTableId);
    const srcC = srcT ? srcT.columns.find(c => c.id === relation.sourceColumnId) : null;
    const tgtC = tgtT ? tgtT.columns.find(c => c.id === relation.targetColumnId) : null;

    if (!srcT || !tgtT || !srcC || !tgtC) return;

    this.modalSummary.innerHTML = `
      <strong>${escapeHtml(srcT.name)}.${escapeHtml(srcC.name)}</strong> (${escapeHtml(srcC.type)})
      <span style="margin:0 6px; color:var(--accent);">→</span>
      <strong>${escapeHtml(tgtT.name)}.${escapeHtml(tgtC.name)}</strong> (${escapeHtml(tgtC.type)})
    `;

    const isMismatch = !this.areTypesCompatible(srcC.type, tgtC.type);
    this.modalWarning.style.display = isMismatch ? 'block' : 'none';

    this.cardinalitySelect.value = relation.cardinality || '1:N';
    this.junctionBox.style.display = relation.cardinality === 'N:M' ? 'block' : 'none';
    this.onDeleteSelect.value = relation.onDelete || 'CASCADE';
    this.onUpdateSelect.value = relation.onUpdate || 'CASCADE';

    this.modalEl.classList.add('is-open');
  }

  closeModal() {
    this.modalEl.classList.remove('is-open');
    this.activeRelation = null;
  }

  saveRelation() {
    if (!this.activeRelation) return;
    history.snapshot();
    this.activeRelation.cardinality = this.cardinalitySelect.value;
    this.activeRelation.onDelete = this.onDeleteSelect.value;
    this.activeRelation.onUpdate = this.onUpdateSelect.value;

    store.saveToStorage();
    this.renderLines();
    this.closeModal();
    showToast('Relationship updated');
  }

  deleteRelation() {
    if (!this.activeRelation) return;
    history.snapshot();
    store.currentProject.relationships = store.relationships.filter(r => r.id !== this.activeRelation.id);
    store.saveToStorage();
    this.renderLines();
    tableManager.renderAll();
    this.closeModal();
    showToast('Relationship removed');
  }

  generateJunctionTable() {
    if (!this.activeRelation) return;
    const rel = this.activeRelation;
    const srcT = store.tables.find(t => t.id === rel.sourceTableId);
    const tgtT = store.tables.find(t => t.id === rel.targetTableId);
    if (!srcT || !tgtT) return;

    history.snapshot();
    const junctionName = `${srcT.name}_${tgtT.name}`;
    const junctionId = generateId('t');
    const col1Id = generateId('col');
    const col2Id = generateId('col');

    const midX = (srcT.x + tgtT.x) / 2;
    const midY = (srcT.y + tgtT.y) / 2 + 80;

    const junctionTable = {
      id: junctionId,
      name: junctionName,
      color: 'slate',
      comment: `Junction table connecting ${srcT.name} and ${tgtT.name}`,
      x: midX,
      y: midY,
      columns: [
        {
          id: col1Id,
          name: `${srcT.name.replace(/s$/, '')}_id`,
          type: srcT.columns.find(c => c.id === rel.sourceColumnId)?.type || 'INT',
          length: '',
          isPk: true,
          isAutoIncrement: false,
          isUnique: false,
          isNullable: false,
          defaultValue: '',
          comment: `FK to ${srcT.name}`
        },
        {
          id: col2Id,
          name: `${tgtT.name.replace(/s$/, '')}_id`,
          type: tgtT.columns.find(c => c.id === rel.targetColumnId)?.type || 'INT',
          length: '',
          isPk: true,
          isAutoIncrement: false,
          isUnique: false,
          isNullable: false,
          defaultValue: '',
          comment: `FK to ${tgtT.name}`
        }
      ]
    };

    // Remove N:M relation and add two 1:N relations
    store.currentProject.relationships = store.relationships.filter(r => r.id !== rel.id);

    store.relationships.push({
      id: generateId('r'),
      sourceTableId: srcT.id,
      sourceColumnId: rel.sourceColumnId,
      targetTableId: junctionId,
      targetColumnId: col1Id,
      cardinality: '1:N',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    store.relationships.push({
      id: generateId('r'),
      sourceTableId: tgtT.id,
      sourceColumnId: rel.targetColumnId,
      targetTableId: junctionId,
      targetColumnId: col2Id,
      cardinality: '1:N',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    store.tables.push(junctionTable);
    store.saveToStorage();
    this.closeModal();
    tableManager.renderAll();
    showToast(`Generated junction table ${junctionName}`);
  }
}

// =============================================================================
// 6. SQL GENERATORS (POSTGRESQL, MYSQL, SQLITE)
// =============================================================================
class SqlGenerator {
  generate(dialect = 'postgresql') {
    const tables = this.getTopologicalSortedTables();
    let sql = `-- ==========================================================\n`;
    sql += `-- SchemaForge DDL Export\n`;
    sql += `-- Dialect: ${dialect.toUpperCase()}\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n`;
    sql += `-- ==========================================================\n\n`;

    if (dialect === 'postgresql') {
      sql += this.generatePostgres(tables);
    } else if (dialect === 'mysql') {
      sql += this.generateMySQL(tables);
    } else {
      sql += this.generateSQLite(tables);
    }

    return sql;
  }

  getTopologicalSortedTables() {
    const tables = [...store.tables];
    const rels = store.relationships;

    // Build dependency graph: target table depends on source table
    const inDegree = new Map();
    const adj = new Map();

    for (const t of tables) {
      inDegree.set(t.id, 0);
      adj.set(t.id, []);
    }

    for (const r of rels) {
      if (inDegree.has(r.targetTableId) && adj.has(r.sourceTableId)) {
        inDegree.set(r.targetTableId, inDegree.get(r.targetTableId) + 1);
        adj.get(r.sourceTableId).push(r.targetTableId);
      }
    }

    const queue = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const sortedIds = [];
    while (queue.length > 0) {
      const u = queue.shift();
      sortedIds.push(u);

      for (const v of adj.get(u) || []) {
        inDegree.set(v, inDegree.get(v) - 1);
        if (inDegree.get(v) === 0) queue.push(v);
      }
    }

    // Add remaining tables if circular dependency exists
    for (const t of tables) {
      if (!sortedIds.includes(t.id)) sortedIds.push(t.id);
    }

    return sortedIds.map(id => tables.find(t => t.id === id)).filter(Boolean);
  }

  generatePostgres(tables) {
    let out = '';
    const tableComments = [];
    const columnComments = [];

    for (const table of tables) {
      out += `CREATE TABLE "${table.name}" (\n`;
      const lines = [];

      for (const col of table.columns) {
        let colDef = `  "${col.name}" `;
        let typeStr = this.mapTypeToPostgres(col.type, col.length, col.isAutoIncrement);
        colDef += typeStr;

        if (!col.isNullable) colDef += ' NOT NULL';
        if (col.defaultValue && !col.isAutoIncrement) colDef += ` DEFAULT ${col.defaultValue}`;
        if (col.isUnique && !col.isPk) colDef += ' UNIQUE';

        lines.push(colDef);

        if (col.comment) {
          columnComments.push(`COMMENT ON COLUMN "${table.name}"."${col.name}" IS '${col.comment.replace(/'/g, "''")}';`);
        }
      }

      // Primary Key
      const pks = table.columns.filter(c => c.isPk);
      if (pks.length > 0) {
        lines.push(`  PRIMARY KEY (${pks.map(c => `"${c.name}"`).join(', ')})`);
      }

      // Foreign Keys where targetTable is this table
      const fks = store.relationships.filter(r => r.targetTableId === table.id);
      for (const rel of fks) {
        const srcT = store.tables.find(t => t.id === rel.sourceTableId);
        const srcC = srcT ? srcT.columns.find(c => c.id === rel.sourceColumnId) : null;
        const tgtC = table.columns.find(c => c.id === rel.targetColumnId);
        if (srcT && srcC && tgtC) {
          const fkName = `fk_${table.name}_${tgtC.name}`;
          lines.push(
            `  CONSTRAINT "${fkName}" FOREIGN KEY ("${tgtC.name}") REFERENCES "${srcT.name}" ("${srcC.name}") ON DELETE ${rel.onDelete || 'CASCADE'} ON UPDATE ${rel.onUpdate || 'CASCADE'}`
          );
        }
      }

      out += lines.join(',\n') + '\n);\n\n';

      if (table.comment) {
        tableComments.push(`COMMENT ON TABLE "${table.name}" IS '${table.comment.replace(/'/g, "''")}';`);
      }
    }

    if (tableComments.length > 0 || columnComments.length > 0) {
      out += `-- Comments\n` + [...tableComments, ...columnComments].join('\n') + '\n\n';
    }

    return out;
  }

  generateMySQL(tables) {
    let out = '';
    for (const table of tables) {
      out += `CREATE TABLE \`${table.name}\` (\n`;
      const lines = [];

      for (const col of table.columns) {
        let colDef = `  \`${col.name}\` `;
        let typeStr = this.mapTypeToMySQL(col.type, col.length);
        colDef += typeStr;

        if (col.isAutoIncrement) colDef += ' AUTO_INCREMENT';
        if (!col.isNullable) colDef += ' NOT NULL';
        if (col.defaultValue && !col.isAutoIncrement) colDef += ` DEFAULT ${col.defaultValue}`;
        if (col.isUnique && !col.isPk) colDef += ' UNIQUE';
        if (col.comment) colDef += ` COMMENT '${col.comment.replace(/'/g, "''")}'`;

        lines.push(colDef);
      }

      // Primary Key
      const pks = table.columns.filter(c => c.isPk);
      if (pks.length > 0) {
        lines.push(`  PRIMARY KEY (${pks.map(c => `\`${c.name}\``).join(', ')})`);
      }

      // Foreign Keys
      const fks = store.relationships.filter(r => r.targetTableId === table.id);
      for (const rel of fks) {
        const srcT = store.tables.find(t => t.id === rel.sourceTableId);
        const srcC = srcT ? srcT.columns.find(c => c.id === rel.sourceColumnId) : null;
        const tgtC = table.columns.find(c => c.id === rel.targetColumnId);
        if (srcT && srcC && tgtC) {
          const fkName = `fk_${table.name}_${tgtC.name}`;
          lines.push(
            `  CONSTRAINT \`${fkName}\` FOREIGN KEY (\`${tgtC.name}\`) REFERENCES \`${srcT.name}\` (\`${srcC.name}\`) ON DELETE ${rel.onDelete || 'CASCADE'} ON UPDATE ${rel.onUpdate || 'CASCADE'}`
          );
        }
      }

      out += lines.join(',\n') + '\n)';
      out += ` ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
      if (table.comment) {
        out += ` COMMENT='${table.comment.replace(/'/g, "''")}'`;
      }
      out += ';\n\n';
    }
    return out;
  }

  generateSQLite(tables) {
    let out = '';
    for (const table of tables) {
      out += `CREATE TABLE "${table.name}" (\n`;
      const lines = [];

      for (const col of table.columns) {
        let colDef = `  "${col.name}" `;
        let typeStr = this.mapTypeToSQLite(col.type);

        if (col.isPk && col.isAutoIncrement) {
          colDef += 'INTEGER PRIMARY KEY AUTOINCREMENT';
        } else {
          colDef += typeStr;
          if (!col.isNullable) colDef += ' NOT NULL';
          if (col.defaultValue) colDef += ` DEFAULT ${col.defaultValue}`;
          if (col.isUnique) colDef += ' UNIQUE';
        }

        lines.push(colDef);
      }

      // Composite or non-autoincrement PK
      const pks = table.columns.filter(c => c.isPk);
      const hasAiPk = table.columns.some(c => c.isPk && c.isAutoIncrement);
      if (pks.length > 0 && !hasAiPk) {
        lines.push(`  PRIMARY KEY (${pks.map(c => `"${c.name}"`).join(', ')})`);
      }

      // Foreign Keys
      const fks = store.relationships.filter(r => r.targetTableId === table.id);
      for (const rel of fks) {
        const srcT = store.tables.find(t => t.id === rel.sourceTableId);
        const srcC = srcT ? srcT.columns.find(c => c.id === rel.sourceColumnId) : null;
        const tgtC = table.columns.find(c => c.id === rel.targetColumnId);
        if (srcT && srcC && tgtC) {
          lines.push(
            `  FOREIGN KEY ("${tgtC.name}") REFERENCES "${srcT.name}" ("${srcC.name}") ON DELETE ${rel.onDelete || 'CASCADE'} ON UPDATE ${rel.onUpdate || 'CASCADE'}`
          );
        }
      }

      out += lines.join(',\n') + '\n);\n\n';
    }
    return out;
  }

  mapTypeToPostgres(type, len, isAutoIncrement) {
    if (isAutoIncrement) {
      return type === 'BIGINT' ? 'BIGSERIAL' : 'SERIAL';
    }
    switch (type.toUpperCase()) {
      case 'INT': return 'INTEGER';
      case 'BIGINT': return 'BIGINT';
      case 'VARCHAR': return len ? `VARCHAR(${len})` : 'VARCHAR(255)';
      case 'TEXT': return 'TEXT';
      case 'BOOLEAN': return 'BOOLEAN';
      case 'DATE': return 'DATE';
      case 'DATETIME':
      case 'TIMESTAMP': return 'TIMESTAMPTZ';
      case 'DECIMAL': return len ? `NUMERIC(${len})` : 'NUMERIC(10,2)';
      case 'FLOAT': return 'DOUBLE PRECISION';
      case 'JSON': return 'JSONB';
      case 'UUID': return 'UUID';
      case 'ENUM': return 'VARCHAR(50)';
      default: return type;
    }
  }

  mapTypeToMySQL(type, len) {
    switch (type.toUpperCase()) {
      case 'INT': return 'INT';
      case 'BIGINT': return 'BIGINT';
      case 'VARCHAR': return len ? `VARCHAR(${len})` : 'VARCHAR(255)';
      case 'TEXT': return 'TEXT';
      case 'BOOLEAN': return 'TINYINT(1)';
      case 'DATE': return 'DATE';
      case 'DATETIME': return 'DATETIME';
      case 'TIMESTAMP': return 'TIMESTAMP';
      case 'DECIMAL': return len ? `DECIMAL(${len})` : 'DECIMAL(10,2)';
      case 'FLOAT': return 'FLOAT';
      case 'JSON': return 'JSON';
      case 'UUID': return 'CHAR(36)';
      case 'ENUM': return 'ENUM';
      default: return type;
    }
  }

  mapTypeToSQLite(type) {
    switch (type.toUpperCase()) {
      case 'INT':
      case 'BIGINT': return 'INTEGER';
      case 'VARCHAR':
      case 'TEXT':
      case 'JSON':
      case 'UUID':
      case 'ENUM': return 'TEXT';
      case 'BOOLEAN': return 'INTEGER';
      case 'DATE':
      case 'DATETIME':
      case 'TIMESTAMP': return 'TEXT';
      case 'DECIMAL':
      case 'FLOAT': return 'REAL';
      default: return 'TEXT';
    }
  }

  highlightSql(sql) {
    const keywords = [
      'CREATE TABLE', 'TABLE', 'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES',
      'NOT NULL', 'NULL', 'DEFAULT', 'UNIQUE', 'CONSTRAINT', 'AUTO_INCREMENT',
      'AUTOINCREMENT', 'SERIAL', 'BIGSERIAL', 'ON DELETE', 'ON UPDATE', 'CASCADE',
      'SET NULL', 'RESTRICT', 'NO ACTION', 'COMMENT ON', 'IS', 'ENGINE=InnoDB'
    ];

    let escaped = escapeHtml(sql);

    // Comments
    escaped = escaped.replace(/(--.*$)/gm, '<span class="sql-comment">$1</span>');

    // Strings
    escaped = escaped.replace(/('(?:''|[^'\\]|\\.)*')/g, '<span class="sql-string">$1</span>');

    // Types
    const typesRegex = /\b(INT|INTEGER|BIGINT|VARCHAR|TEXT|BOOLEAN|DATE|DATETIME|TIMESTAMP|TIMESTAMPTZ|DECIMAL|NUMERIC|FLOAT|DOUBLE PRECISION|JSON|JSONB|UUID|REAL|BLOB|TINYINT)\b/gi;
    escaped = escaped.replace(typesRegex, '<span class="sql-type">$1</span>');

    // Keywords
    for (const kw of keywords) {
      const reg = new RegExp(`\\b(${kw})\\b`, 'gi');
      escaped = escaped.replace(reg, '<span class="sql-keyword">$1</span>');
    }

    return escaped;
  }
}

const sqlGenerator = new SqlGenerator();

// =============================================================================
// 7. SQL PARSER & IMPORT
// =============================================================================
class SqlParser {
  parse(sqlText) {
    const tables = [];
    const relationships = [];

    // Strip block comments and line comments
    let cleaned = sqlText.replace(/\/\*[\s\S]*?\*\//g, '');
    cleaned = cleaned.replace(/--.*$/gm, '');

    // Regex for CREATE TABLE statements
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"']?[\w_]+[`"']?)\s*\(([\s\S]*?)\)(?:\s*(?:ENGINE\s*=\s*\w+)?\s*(?:DEFAULT\s+CHARSET\s*=\s*\w+)?\s*(?:COLLATE\s*=\s*[\w_]+)?\s*(?:COMMENT\s*=\s*'[^']*')?\s*);/gi;

    let match;
    let tableIndex = 0;

    while ((match = createTableRegex.exec(cleaned)) !== null) {
      const rawTableName = match[1].replace(/[`"']/g, '').trim();
      const body = match[2];

      const tableId = generateId('t');
      const table = {
        id: tableId,
        name: rawTableName,
        color: PALETTE_COLORS[tableIndex % PALETTE_COLORS.length],
        comment: '',
        x: 80 + (tableIndex % 3) * 360,
        y: 80 + Math.floor(tableIndex / 3) * 340,
        columns: []
      };

      // Split lines inside parenthesis respecting commas inside types like DECIMAL(10,2)
      const lines = this.splitColumnLines(body);

      const tableLevelFks = [];
      const tableLevelPks = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Table level Primary Key
        const pkMatch = /^PRIMARY\s+KEY\s*\(([^)]+)\)/i.exec(trimmed);
        if (pkMatch) {
          const pkCols = pkMatch[1].split(',').map(s => s.replace(/[`"'\s]/g, ''));
          tableLevelPks.push(...pkCols);
          continue;
        }

        // Table level Foreign Key
        const fkMatch = /(?:CONSTRAINT\s+[`"']?\w+[`"']?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+[`"']?(\w+)[`"']?\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|SET NULL|RESTRICT|NO ACTION))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET NULL|RESTRICT|NO ACTION))?/i.exec(trimmed);
        if (fkMatch) {
          tableLevelFks.push({
            column: fkMatch[1].replace(/[`"'\s]/g, ''),
            refTable: fkMatch[2].replace(/[`"'\s]/g, ''),
            refColumn: fkMatch[3].replace(/[`"'\s]/g, ''),
            onDelete: fkMatch[4] || 'CASCADE',
            onUpdate: fkMatch[5] || 'CASCADE'
          });
          continue;
        }

        // Table level Unique
        if (/^UNIQUE\s*(?:KEY|INDEX)?\s*\(/i.test(trimmed)) {
          continue;
        }

        // Otherwise, regular column definition
        const col = this.parseColumn(trimmed);
        if (col) {
          table.columns.push(col);
        }
      }

      // Apply table level PKs
      for (const pkColName of tableLevelPks) {
        const c = table.columns.find(col => col.name.toLowerCase() === pkColName.toLowerCase());
        if (c) c.isPk = true;
      }

      table._pendingFks = tableLevelFks;
      tables.push(table);
      tableIndex++;
    }

    if (tables.length === 0) {
      throw new Error('No valid CREATE TABLE statements detected. Check SQL syntax and quotes.');
    }

    // Resolve Foreign Keys to Relationships
    for (const table of tables) {
      for (const fk of table._pendingFks || []) {
        const srcTable = tables.find(t => t.name.toLowerCase() === fk.refTable.toLowerCase());
        if (!srcTable) continue;

        const srcCol = srcTable.columns.find(c => c.name.toLowerCase() === fk.refColumn.toLowerCase()) || srcTable.columns[0];
        const tgtCol = table.columns.find(c => c.name.toLowerCase() === fk.column.toLowerCase());

        if (srcCol && tgtCol) {
          relationships.push({
            id: generateId('r'),
            sourceTableId: srcTable.id,
            sourceColumnId: srcCol.id,
            targetTableId: table.id,
            targetColumnId: tgtCol.id,
            cardinality: '1:N',
            onDelete: fk.onDelete || 'CASCADE',
            onUpdate: fk.onUpdate || 'CASCADE'
          });
        }
      }
      delete table._pendingFks;
    }

    return { tables, relationships };
  }

  splitColumnLines(body) {
    const lines = [];
    let current = '';
    let parenDepth = 0;
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if ((ch === "'" || ch === '"' || ch === '`') && body[i - 1] !== '\\') {
        if (!inQuote) {
          inQuote = true;
          quoteChar = ch;
        } else if (quoteChar === ch) {
          inQuote = false;
        }
      }

      if (!inQuote) {
        if (ch === '(') parenDepth++;
        else if (ch === ')') parenDepth--;
        else if (ch === ',' && parenDepth === 0) {
          lines.push(current);
          current = '';
          continue;
        }
      }
      current += ch;
    }
    if (current.trim()) lines.push(current);
    return lines;
  }

  parseColumn(line) {
    const tokens = line.split(/\s+/);
    if (tokens.length < 2) return null;

    const rawName = tokens[0].replace(/[`"']/g, '').trim();
    const rawType = tokens[1].replace(/,/g, '').trim();

    // Type and length
    let type = rawType;
    let length = '';
    const typeMatch = /^(\w+)(?:\(([^)]+)\))?$/i.exec(rawType);
    if (typeMatch) {
      type = typeMatch[1].toUpperCase();
      length = typeMatch[2] || '';
    }

    const rest = line.substring(line.indexOf(tokens[1]) + tokens[1].length);

    const isPk = /PRIMARY\s+KEY/i.test(rest);
    const isAutoIncrement = /AUTO_INCREMENT|SERIAL|AUTOINCREMENT/i.test(line);
    const isUnique = /UNIQUE/i.test(rest);
    const isNullable = !/NOT\s+NULL/i.test(rest);

    let defaultValue = '';
    const defaultMatch = /DEFAULT\s+([^,]+)/i.exec(rest);
    if (defaultMatch) {
      defaultValue = defaultMatch[1].trim();
    }

    let comment = '';
    const commentMatch = /COMMENT\s+'([^']+)'/i.exec(rest);
    if (commentMatch) {
      comment = commentMatch[1];
    }

    return {
      id: generateId('col'),
      name: rawName,
      type: this.normalizeType(type),
      length: length,
      isPk,
      isAutoIncrement,
      isUnique,
      isNullable,
      defaultValue,
      comment
    };
  }

  normalizeType(t) {
    const up = t.toUpperCase();
    if (['INT', 'INTEGER', 'SMALLINT', 'TINYINT', 'MEDIUMINT'].includes(up)) return 'INT';
    if (['BIGINT'].includes(up)) return 'BIGINT';
    if (['VARCHAR', 'NVARCHAR', 'CHAR', 'CHARACTER'].includes(up)) return 'VARCHAR';
    if (['TEXT', 'MEDIUMTEXT', 'LONGTEXT', 'CLOB'].includes(up)) return 'TEXT';
    if (['BOOLEAN', 'BOOL'].includes(up)) return 'BOOLEAN';
    if (['DATE'].includes(up)) return 'DATE';
    if (['DATETIME'].includes(up)) return 'DATETIME';
    if (['TIMESTAMP', 'TIMESTAMPTZ'].includes(up)) return 'TIMESTAMP';
    if (['DECIMAL', 'NUMERIC'].includes(up)) return 'DECIMAL';
    if (['FLOAT', 'DOUBLE', 'REAL'].includes(up)) return 'FLOAT';
    if (['JSON', 'JSONB'].includes(up)) return 'JSON';
    if (['UUID'].includes(up)) return 'UUID';
    return up;
  }
}

const sqlParser = new SqlParser();

// =============================================================================
// 8. IMPORT AND EXPORT (SQL, PNG, SVG, JSON, URL HASH)
// =============================================================================
class ExportImportManager {
  constructor() {
    this.exportModal = document.getElementById('export-modal');
    this.importModal = document.getElementById('import-modal');
    this.codeViewer = document.getElementById('sql-export-code');
    this.dialectSelect = document.getElementById('export-dialect-select');
    this.copySqlBtn = document.getElementById('copy-sql-btn');
    this.downloadSqlBtn = document.getElementById('download-sql-btn');
    this.downloadPngBtn = document.getElementById('download-png-btn');
    this.downloadSvgBtn = document.getElementById('download-svg-btn');
    this.downloadJsonBtn = document.getElementById('download-json-btn');

    this.setupEvents();
  }

  setupEvents() {
    // Open/Close Modals
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const mobileExportBtn = document.getElementById('mobile-export-btn');
    const exportCloseBtn = document.getElementById('export-modal-close-btn');
    const importCloseBtn = document.getElementById('import-modal-close-btn');
    const importCancelBtn = document.getElementById('import-cancel-btn');

    if (exportBtn) exportBtn.addEventListener('click', () => this.openExportModal());
    if (mobileExportBtn) mobileExportBtn.addEventListener('click', () => this.openExportModal());
    if (exportCloseBtn) exportCloseBtn.addEventListener('click', () => this.closeExportModal());

    if (importBtn) importBtn.addEventListener('click', () => this.openImportModal());
    if (importCloseBtn) importCloseBtn.addEventListener('click', () => this.closeImportModal());
    if (importCancelBtn) importCancelBtn.addEventListener('click', () => this.closeImportModal());

    // Export Tabs
    const exportTabs = this.exportModal.querySelectorAll('.tab-btn');
    exportTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        exportTabs.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        const tab = btn.dataset.exportTab;
        document.getElementById('export-tab-sql').style.display = tab === 'sql' ? 'block' : 'none';
        document.getElementById('export-tab-image').style.display = tab === 'image' ? 'flex' : 'none';
        document.getElementById('export-tab-json').style.display = tab === 'json' ? 'flex' : 'none';
      });
    });

    // Import Tabs
    const importTabs = this.importModal.querySelectorAll('.tab-btn');
    importTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        importTabs.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        const tab = btn.dataset.importTab;
        document.getElementById('import-tab-sql').style.display = tab === 'sql' ? 'flex' : 'none';
        document.getElementById('import-tab-json').style.display = tab === 'json' ? 'flex' : 'none';
      });
    });

    // Dialect change in export
    if (this.dialectSelect) {
      this.dialectSelect.value = store.state.dialect;
      this.dialectSelect.addEventListener('change', () => {
        this.refreshSqlViewer();
      });
    }

    // Copy SQL
    if (this.copySqlBtn) {
      this.copySqlBtn.addEventListener('click', () => {
        const sql = sqlGenerator.generate(this.dialectSelect.value);
        navigator.clipboard.writeText(sql).then(() => {
          showToast('SQL copied to clipboard');
        });
      });
    }

    // Download SQL
    if (this.downloadSqlBtn) {
      this.downloadSqlBtn.addEventListener('click', () => {
        const sql = sqlGenerator.generate(this.dialectSelect.value);
        const filename = `${store.currentProject.name.toLowerCase().replace(/\s+/g, '_')}_schema.sql`;
        this.downloadFile(sql, filename, 'text/sql');
        showToast(`Downloaded ${filename}`);
      });
    }

    // Download JSON
    if (this.downloadJsonBtn) {
      this.downloadJsonBtn.addEventListener('click', () => {
        const json = JSON.stringify(store.currentProject, null, 2);
        const filename = `${store.currentProject.name.toLowerCase().replace(/\s+/g, '_')}_project.json`;
        this.downloadFile(json, filename, 'application/json');
        showToast(`Downloaded ${filename}`);
      });
    }

    // Download PNG
    if (this.downloadPngBtn) {
      this.downloadPngBtn.addEventListener('click', () => this.exportPng());
    }

    // Download SVG
    if (this.downloadSvgBtn) {
      this.downloadSvgBtn.addEventListener('click', () => this.exportSvg());
    }

    // Import Execute
    const importExecBtn = document.getElementById('import-execute-btn');
    if (importExecBtn) {
      importExecBtn.addEventListener('click', () => this.executeImport());
    }

    // Sample SQL
    const sampleSqlBtn = document.getElementById('import-sample-sql-btn');
    if (sampleSqlBtn) {
      sampleSqlBtn.addEventListener('click', () => {
        const txtArea = document.getElementById('import-sql-textarea');
        txtArea.value = sqlGenerator.generate('postgresql');
      });
    }

    // JSON file input
    const jsonInput = document.getElementById('json-file-input');
    if (jsonInput) {
      jsonInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (data.tables && Array.isArray(data.tables)) {
              history.snapshot();
              store.currentProject.tables = data.tables;
              store.currentProject.relationships = data.relationships || [];
              if (data.name) store.currentProject.name = data.name;
              store.saveToStorage();
              tableManager.renderAll();
              canvasManager.fitToScreen();
              this.closeImportModal();
              showToast('Project JSON successfully loaded!');
            } else {
              throw new Error('Invalid SchemaForge JSON schema file');
            }
          } catch (err) {
            showToast(err.message, 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    // Share URL hash button
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => this.shareViaUrlHash());
    }
  }

  openExportModal() {
    this.refreshSqlViewer();
    this.exportModal.classList.add('is-open');
  }

  closeExportModal() {
    this.exportModal.classList.remove('is-open');
  }

  openImportModal() {
    document.getElementById('import-error-msg').style.display = 'none';
    this.importModal.classList.add('is-open');
  }

  closeImportModal() {
    this.importModal.classList.remove('is-open');
  }

  refreshSqlViewer() {
    const dialect = this.dialectSelect ? this.dialectSelect.value : 'postgresql';
    const sql = sqlGenerator.generate(dialect);
    this.codeViewer.innerHTML = sqlGenerator.highlightSql(sql);
  }

  executeImport() {
    const errorEl = document.getElementById('import-error-msg');
    const textarea = document.getElementById('import-sql-textarea');
    errorEl.style.display = 'none';

    try {
      const parsed = sqlParser.parse(textarea.value);
      history.snapshot();
      store.currentProject.tables = parsed.tables;
      store.currentProject.relationships = parsed.relationships;
      store.saveToStorage();

      this.closeImportModal();
      layoutManager.runAutoLayout();
      showToast(`Imported ${parsed.tables.length} tables and ${parsed.relationships.length} relationships!`);
    } catch (err) {
      errorEl.textContent = `Parse Error: ${err.message}`;
      errorEl.style.display = 'block';
    }
  }

  downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  exportPng() {
    const tables = store.tables;
    if (tables.length === 0) {
      showToast('No tables to export', 'warning');
      return;
    }

    // Calculate diagram bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of tables) {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + 270);
      maxY = Math.max(maxY, t.y + 40 + t.columns.length * 30);
    }

    const padding = 60;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const canvas = document.createElement('canvas');
    const scale = 2; // High DPI
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = store.state.theme === 'light' ? '#f8fafc' : '#090d15';
    ctx.fillRect(0, 0, width, height);

    // Grid dots
    ctx.fillStyle = store.state.theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
    for (let x = 0; x < width; x += 24) {
      for (let y = 0; y < height; y += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const offsetX = padding - minX;
    const offsetY = padding - minY;

    // Draw relationships
    for (const rel of store.relationships) {
      const srcT = store.tables.find(t => t.id === rel.sourceTableId);
      const tgtT = store.tables.find(t => t.id === rel.targetTableId);
      if (!srcT || !tgtT) continue;

      const srcSide = srcT.x < tgtT.x ? 'right' : 'left';
      const tgtSide = srcT.x < tgtT.x ? 'left' : 'right';

      const pt1 = relationshipManager.getColumnAnchor(rel.sourceTableId, rel.sourceColumnId, srcSide);
      const pt2 = relationshipManager.getColumnAnchor(rel.targetTableId, rel.targetColumnId, tgtSide);
      if (!pt1 || !pt2) continue;

      const p1x = pt1.x + offsetX;
      const p1y = pt1.y + offsetY;
      const p2x = pt2.x + offsetX;
      const p2y = pt2.y + offsetY;

      const dx = Math.abs(p2x - p1x);
      const curve = Math.max(dx * 0.5, 40);
      const cp1x = srcSide === 'left' ? p1x - curve : p1x + curve;
      const cp2x = tgtSide === 'left' ? p2x - curve : p2x + curve;

      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.bezierCurveTo(cp1x, p1y, cp2x, p2y, p2x, p2y);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw tables
    for (const t of tables) {
      const tx = t.x + offsetX;
      const ty = t.y + offsetY;
      const tw = 270;
      const th = 40 + t.columns.length * 30;

      // Card Body
      ctx.fillStyle = store.state.theme === 'light' ? '#ffffff' : '#111726';
      ctx.strokeStyle = store.state.theme === 'light' ? '#cbd5e1' : 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      this.roundRect(ctx, tx, ty, tw, th, 8, true, true);

      // Card Header
      ctx.fillStyle = '#6366f1';
      this.roundRect(ctx, tx, ty, tw, 36, { tl: 8, tr: 8, bl: 0, br: 0 }, true, false);

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 13px Inter, sans-serif';
      ctx.fillText(t.name, tx + 12, ty + 22);

      // Columns
      t.columns.forEach((col, idx) => {
        const cy = ty + 36 + idx * 30;

        // Row line
        ctx.fillStyle = store.state.theme === 'light' ? '#0f172a' : '#f1f5f9';
        ctx.font = col.isPk ? '600 12px Inter, sans-serif' : '500 12px Inter, sans-serif';

        const prefix = col.isPk ? '🔑 ' : tableManager.isForeignKey(t.id, col.id) ? '🔗 ' : '  ';
        ctx.fillText(prefix + col.name, tx + 10, cy + 20);

        // Type
        ctx.fillStyle = store.state.theme === 'light' ? '#64748b' : '#94a3b8';
        ctx.font = '11px "JetBrains Mono", monospace';
        const typeStr = col.type + (col.length ? `(${col.length})` : '');
        ctx.fillText(typeStr, tx + tw - ctx.measureText(typeStr).width - 12, cy + 20);
      });
    }

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${store.currentProject.name.toLowerCase().replace(/\s+/g, '_')}_schema.png`;
    a.click();
    showToast('PNG image exported');
  }

  roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof radius === 'number') {
      radius = { tl: radius, tr: radius, br: radius, bl: radius };
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  exportSvg() {
    const tables = store.tables;
    if (tables.length === 0) {
      showToast('No tables to export', 'warning');
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of tables) {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + 270);
      maxY = Math.max(maxY, t.y + 40 + t.columns.length * 30);
    }

    const padding = 60;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    const offsetX = padding - minX;
    const offsetY = padding - minY;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;
    svg += `  <style>\n`;
    svg += `    .bg { fill: #090d15; }\n`;
    svg += `    .card { fill: #111726; stroke: rgba(255,255,255,0.14); stroke-width: 1px; rx: 8px; }\n`;
    svg += `    .header { fill: #6366f1; rx: 8px; }\n`;
    svg += `    .text-title { fill: #ffffff; font-family: Inter, sans-serif; font-weight: 600; font-size: 13px; }\n`;
    svg += `    .text-col { fill: #f1f5f9; font-family: Inter, sans-serif; font-size: 12px; }\n`;
    svg += `    .text-type { fill: #94a3b8; font-family: 'JetBrains Mono', monospace; font-size: 11px; }\n`;
    svg += `    .rel-line { fill: none; stroke: #6366f1; stroke-width: 2px; }\n`;
    svg += `  </style>\n`;

    svg += `  <rect width="100%" height="100%" class="bg" />\n`;

    // Relationship lines
    for (const rel of store.relationships) {
      const srcT = store.tables.find(t => t.id === rel.sourceTableId);
      const tgtT = store.tables.find(t => t.id === rel.targetTableId);
      if (!srcT || !tgtT) continue;

      const srcSide = srcT.x < tgtT.x ? 'right' : 'left';
      const tgtSide = srcT.x < tgtT.x ? 'left' : 'right';

      const pt1 = relationshipManager.getColumnAnchor(rel.sourceTableId, rel.sourceColumnId, srcSide);
      const pt2 = relationshipManager.getColumnAnchor(rel.targetTableId, rel.targetColumnId, tgtSide);
      if (!pt1 || !pt2) continue;

      const p1x = pt1.x + offsetX;
      const p1y = pt1.y + offsetY;
      const p2x = pt2.x + offsetX;
      const p2y = pt2.y + offsetY;

      const path = relationshipManager.calculateBezierPath({ x: p1x, y: p1y }, { x: p2x, y: p2y }, srcSide, tgtSide);
      svg += `  <path d="${path}" class="rel-line" />\n`;
    }

    // Tables
    for (const t of tables) {
      const tx = t.x + offsetX;
      const ty = t.y + offsetY;
      const tw = 270;
      const th = 40 + t.columns.length * 30;

      svg += `  <g transform="translate(${tx}, ${ty})">\n`;
      svg += `    <rect width="${tw}" height="${th}" class="card" />\n`;
      svg += `    <rect width="${tw}" height="36" class="header" />\n`;
      svg += `    <text x="12" y="23" class="text-title">${escapeHtml(t.name)}</text>\n`;

      t.columns.forEach((col, idx) => {
        const cy = 36 + idx * 30 + 20;
        const prefix = col.isPk ? '🔑 ' : tableManager.isForeignKey(t.id, col.id) ? '🔗 ' : '  ';
        svg += `    <text x="12" y="${cy}" class="text-col">${prefix}${escapeHtml(col.name)}</text>\n`;
        const typeStr = escapeHtml(col.type + (col.length ? `(${col.length})` : ''));
        svg += `    <text x="${tw - 12}" y="${cy}" text-anchor="end" class="text-type">${typeStr}</text>\n`;
      });

      svg += `  </g>\n`;
    }

    svg += `</svg>`;

    this.downloadFile(svg, `${store.currentProject.name.toLowerCase().replace(/\s+/g, '_')}_schema.svg`, 'image/svg+xml');
    showToast('SVG vector exported');
  }

  shareViaUrlHash() {
    try {
      const data = {
        name: store.currentProject.name,
        dialect: store.state.dialect,
        tables: store.tables,
        relationships: store.relationships
      };

      const jsonStr = JSON.stringify(data);
      const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(jsonStr))));
      window.location.hash = `schema=${encoded}`;

      navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('Shareable URL copied to clipboard!');
      });
    } catch (e) {
      showToast('Could not generate share link', 'error');
    }
  }

  checkUrlHashOnLoad() {
    const hash = window.location.hash;
    if (hash && hash.includes('schema=')) {
      try {
        const base64Str = decodeURIComponent(hash.split('schema=')[1]);
        const jsonStr = decodeURIComponent(escape(atob(base64Str)));
        const data = JSON.parse(jsonStr);

        if (data.tables && Array.isArray(data.tables)) {
          const newProj = {
            id: generateId('proj'),
            name: data.name || 'Shared Schema',
            tables: data.tables,
            relationships: data.relationships || [],
            updatedAt: Date.now()
          };
          store.state.projects.unshift(newProj);
          store.state.currentProjectId = newProj.id;
          if (data.dialect) store.state.dialect = data.dialect;

          store.saveToStorage();
          tableManager.renderAll();
          canvasManager.fitToScreen();
          showToast(`Loaded shared project: ${newProj.name}`);
        }
      } catch (err) {
        console.warn('Failed to parse URL hash schema:', err);
      }
    }
  }
}

// =============================================================================
// 9. UI PANELS (EDITOR, HEALTH, COMMAND PALETTE, MODALS, TEMPLATES)
// =============================================================================
class PanelManager {
  constructor() {
    this.editorPanel = document.getElementById('editor-panel');
    this.editorTitle = document.getElementById('editor-panel-title');
    this.nameInput = document.getElementById('edit-table-name');
    this.commentInput = document.getElementById('edit-table-comment');
    this.swatchesContainer = document.getElementById('color-swatches-container');
    this.columnsList = document.getElementById('columns-editor-list');
    this.columnCountLabel = document.getElementById('column-count-label');
    this.addColumnBtn = document.getElementById('add-column-btn');
    this.duplicateBtn = document.getElementById('duplicate-table-btn');
    this.deleteBtn = document.getElementById('delete-table-btn');
    this.closeBtn = document.getElementById('editor-close-btn');
    this.dragHandle = document.getElementById('sheet-drag-handle');

    this.activeTable = null;
    this.setupEvents();
  }

  setupEvents() {
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.closeEditor());

    if (this.nameInput) {
      this.nameInput.addEventListener('input', () => {
        if (!this.activeTable) return;
        this.activeTable.name = this.nameInput.value.trim() || 'table';
        store.saveToStorage();
        tableManager.renderAll();
      });
    }

    if (this.commentInput) {
      this.commentInput.addEventListener('input', () => {
        if (!this.activeTable) return;
        this.activeTable.comment = this.commentInput.value.trim();
        store.saveToStorage();
        tableManager.renderAll();
      });
    }

    if (this.swatchesContainer) {
      this.swatchesContainer.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
          if (!this.activeTable) return;
          history.snapshot();
          this.activeTable.color = swatch.dataset.color;
          this.updateActiveSwatch(this.activeTable.color);
          store.saveToStorage();
          tableManager.renderAll();
        });
      });
    }

    if (this.addColumnBtn) {
      this.addColumnBtn.addEventListener('click', () => this.addNewColumn());
    }

    if (this.duplicateBtn) {
      this.duplicateBtn.addEventListener('click', () => {
        if (this.activeTable) tableManager.duplicateTable(this.activeTable.id);
      });
    }

    if (this.deleteBtn) {
      this.deleteBtn.addEventListener('click', () => {
        if (this.activeTable) tableManager.deleteTable(this.activeTable.id);
      });
    }

    // Touch handle to drag bottom sheet on mobile
    if (this.dragHandle) {
      let startY = 0;
      let startHeight = 0;

      this.dragHandle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        startHeight = this.editorPanel.clientHeight;
      });

      this.dragHandle.addEventListener('touchmove', (e) => {
        const dy = startY - e.touches[0].clientY;
        const newH = clamp(startHeight + dy, 200, window.innerHeight * 0.9);
        this.editorPanel.style.height = `${newH}px`;
      });
    }
  }

  openEditor(tableId) {
    const table = store.tables.find(t => t.id === tableId);
    if (!table) return;

    this.activeTable = table;
    store.state.activeEditorTableId = table.id;

    this.editorTitle.textContent = `Edit ${table.name}`;
    this.nameInput.value = table.name;
    this.commentInput.value = table.comment || '';
    this.updateActiveSwatch(table.color);

    this.renderColumnsList();
    this.editorPanel.classList.add('is-open');
  }

  closeEditor() {
    this.editorPanel.classList.remove('is-open');
    this.activeTable = null;
    store.state.activeEditorTableId = null;
  }

  updateActiveSwatch(activeColor) {
    this.swatchesContainer.querySelectorAll('.color-swatch').forEach(swatch => {
      if (swatch.dataset.color === activeColor) {
        swatch.classList.add('is-active');
      } else {
        swatch.classList.remove('is-active');
      }
    });
  }

  renderColumnsList() {
    if (!this.activeTable) return;
    this.columnsList.innerHTML = '';
    const columns = this.activeTable.columns;
    this.columnCountLabel.textContent = columns.length;

    columns.forEach((col, index) => {
      const card = document.createElement('div');
      card.className = 'column-card';

      // Type options
      const typeOptions = DATA_TYPES.map(
        t => `<option value="${t}" ${t === col.type ? 'selected' : ''}>${t}</option>`
      ).join('');

      card.innerHTML = `
        <div class="column-card-top">
          <span class="column-drag-handle" title="Move up/down">⋮⋮</span>
          <input type="text" class="form-input col-edit-name" value="${escapeHtml(col.name)}" placeholder="column_name" />
          <button class="btn-icon col-del-btn" title="Delete Column" style="color:var(--color-rose);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
          </button>
        </div>

        <div class="column-type-grid">
          <select class="form-select col-edit-type">${typeOptions}</select>
          <input type="text" class="form-input col-edit-len" value="${escapeHtml(col.length || '')}" placeholder="Length (e.g. 255)" />
        </div>

        <div class="column-toggles-row">
          <label class="toggle-label"><input type="checkbox" class="col-edit-pk" ${col.isPk ? 'checked' : ''}/> PK</label>
          <label class="toggle-label"><input type="checkbox" class="col-edit-ai" ${col.isAutoIncrement ? 'checked' : ''}/> AI</label>
          <label class="toggle-label"><input type="checkbox" class="col-edit-uq" ${col.isUnique ? 'checked' : ''}/> Unique</label>
          <label class="toggle-label"><input type="checkbox" class="col-edit-null" ${col.isNullable ? 'checked' : ''}/> Nullable</label>
        </div>

        <div class="column-card-details">
          <input type="text" class="form-input col-edit-def" value="${escapeHtml(col.defaultValue || '')}" placeholder="Default value..." />
          <input type="text" class="form-input col-edit-com" value="${escapeHtml(col.comment || '')}" placeholder="Comment..." />
        </div>
      `;

      // Handlers
      const nameInp = card.querySelector('.col-edit-name');
      const typeSel = card.querySelector('.col-edit-type');
      const lenInp = card.querySelector('.col-edit-len');
      const pkCheck = card.querySelector('.col-edit-pk');
      const aiCheck = card.querySelector('.col-edit-ai');
      const uqCheck = card.querySelector('.col-edit-uq');
      const nullCheck = card.querySelector('.col-edit-null');
      const defInp = card.querySelector('.col-edit-def');
      const comInp = card.querySelector('.col-edit-com');
      const delBtn = card.querySelector('.col-del-btn');

      const updateCol = () => {
        col.name = nameInp.value.trim() || 'col';
        col.type = typeSel.value;
        col.length = lenInp.value.trim();
        col.isPk = pkCheck.checked;
        col.isAutoIncrement = aiCheck.checked;
        col.isUnique = uqCheck.checked;
        col.isNullable = nullCheck.checked;
        col.defaultValue = defInp.value.trim();
        col.comment = comInp.value.trim();

        store.saveToStorage();
        tableManager.renderAll();
      };

      nameInp.addEventListener('input', updateCol);
      typeSel.addEventListener('change', updateCol);
      lenInp.addEventListener('input', updateCol);
      pkCheck.addEventListener('change', updateCol);
      aiCheck.addEventListener('change', updateCol);
      uqCheck.addEventListener('change', updateCol);
      nullCheck.addEventListener('change', updateCol);
      defInp.addEventListener('input', updateCol);
      comInp.addEventListener('input', updateCol);

      delBtn.addEventListener('click', () => {
        if (this.activeTable.columns.length <= 1) {
          showToast('Table must have at least one column', 'warning');
          return;
        }
        history.snapshot();
        this.activeTable.columns = this.activeTable.columns.filter(c => c.id !== col.id);
        // Clean related relationships
        store.currentProject.relationships = store.relationships.filter(
          r => r.sourceColumnId !== col.id && r.targetColumnId !== col.id
        );
        store.saveToStorage();
        this.renderColumnsList();
        tableManager.renderAll();
      });

      this.columnsList.appendChild(card);
    });
  }

  addNewColumn() {
    if (!this.activeTable) return;
    history.snapshot();
    const count = this.activeTable.columns.length + 1;
    this.activeTable.columns.push({
      id: generateId('col'),
      name: `column_${count}`,
      type: 'VARCHAR',
      length: '255',
      isPk: false,
      isAutoIncrement: false,
      isUnique: false,
      isNullable: true,
      defaultValue: '',
      comment: ''
    });

    store.saveToStorage();
    this.renderColumnsList();
    tableManager.renderAll();
  }
}

// =============================================================================
// AUTO LAYOUT ALGORITHM (HIERARCHICAL / DAGRE-LIKE)
// =============================================================================
class AutoLayoutManager {
  runAutoLayout() {
    const tables = store.tables;
    if (tables.length === 0) return;

    history.snapshot();

    // Compute in-degrees and build layers
    const rels = store.relationships;
    const inDegree = new Map();
    const children = new Map();

    for (const t of tables) {
      inDegree.set(t.id, 0);
      children.set(t.id, []);
    }

    for (const r of rels) {
      if (inDegree.has(r.targetTableId)) {
        inDegree.set(r.targetTableId, inDegree.get(r.targetTableId) + 1);
        children.get(r.sourceTableId).push(r.targetTableId);
      }
    }

    // Assign layers
    const layers = new Map();
    const queue = [];

    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) {
        layers.set(id, 0);
        queue.push(id);
      }
    }

    while (queue.length > 0) {
      const u = queue.shift();
      const currentLayer = layers.get(u);

      for (const v of children.get(u) || []) {
        const nextLayer = currentLayer + 1;
        if (!layers.has(v) || layers.get(v) < nextLayer) {
          layers.set(v, nextLayer);
          queue.push(v);
        }
      }
    }

    // Fallback for remaining unlayered (cycles or isolated)
    for (const t of tables) {
      if (!layers.has(t.id)) layers.set(t.id, 0);
    }

    // Group tables by layer
    const columns = [];
    for (const t of tables) {
      const layer = layers.get(t.id);
      if (!columns[layer]) columns[layer] = [];
      columns[layer].push(t);
    }

    // Layout coordinates
    const startX = 60;
    const startY = 80;
    const colSpacing = 380;
    const rowSpacing = 40;

    columns.forEach((colTables, colIndex) => {
      let currentY = startY;
      colTables.forEach(t => {
        t.x = startX + colIndex * colSpacing;
        t.y = currentY;
        const cardHeight = 40 + t.columns.length * 30;
        currentY += cardHeight + rowSpacing;
      });
    });

    store.saveToStorage();
    tableManager.renderAll();
    canvasManager.fitToScreen();
    showToast('Auto layout completed');
  }
}

// =============================================================================
// SCHEMA HEALTH INSPECTION
// =============================================================================
class HealthManager {
  constructor() {
    this.badgeCount = document.getElementById('health-badge-count');
    this.modalEl = document.getElementById('health-modal');
    this.summaryEl = document.getElementById('health-status-summary');
    this.issuesListEl = document.getElementById('health-issues-list');
    this.closeBtn = document.getElementById('health-modal-close-btn');

    this.issues = [];
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.closeModal());
  }

  checkHealth() {
    this.issues = [];
    const tables = store.tables;

    for (const t of tables) {
      // 1. Missing Primary Key
      const hasPk = t.columns.some(c => c.isPk);
      if (!hasPk) {
        this.issues.push({
          type: 'warning',
          tableId: t.id,
          title: `Table "${t.name}" has no primary key`,
          subtitle: 'Tables should have a primary key for entity integrity and indexing.'
        });
      }

      // 2. Duplicate column names
      const names = new Set();
      for (const col of t.columns) {
        const lower = col.name.toLowerCase();
        if (names.has(lower)) {
          this.issues.push({
            type: 'warning',
            tableId: t.id,
            title: `Duplicate column "${col.name}" in "${t.name}"`,
            subtitle: 'Column names must be unique within a table.'
          });
        }
        names.add(lower);
      }

      // 3. Isolated table
      const isConnected = store.relationships.some(
        r => r.sourceTableId === t.id || r.targetTableId === t.id
      );
      if (!isConnected && tables.length > 1) {
        this.issues.push({
          type: 'info',
          tableId: t.id,
          title: `Isolated table "${t.name}"`,
          subtitle: 'This table has no foreign key relationships.'
        });
      }
    }

    // 4. Type mismatch in relationships
    for (const rel of store.relationships) {
      const srcT = tables.find(t => t.id === rel.sourceTableId);
      const tgtT = tables.find(t => t.id === rel.targetTableId);
      if (srcT && tgtT) {
        const srcC = srcT.columns.find(c => c.id === rel.sourceColumnId);
        const tgtC = tgtT.columns.find(c => c.id === rel.targetColumnId);
        if (srcC && tgtC && !relationshipManager.areTypesCompatible(srcC.type, tgtC.type)) {
          this.issues.push({
            type: 'warning',
            tableId: tgtT.id,
            title: `Type mismatch in relationship`,
            subtitle: `${srcT.name}.${srcC.name} (${srcC.type}) → ${tgtT.name}.${tgtC.name} (${tgtC.type})`
          });
        }
      }
    }

    // Update Header Badge
    if (this.badgeCount) {
      if (this.issues.length > 0) {
        this.badgeCount.textContent = this.issues.length;
        this.badgeCount.style.display = 'inline-block';
      } else {
        this.badgeCount.style.display = 'none';
      }
    }
  }

  openModal() {
    this.checkHealth();
    this.issuesListEl.innerHTML = '';

    if (this.issues.length === 0) {
      this.summaryEl.innerHTML = `
        <div style="color:var(--color-emerald); display:flex; align-items:center; gap:6px;">
          <span>✓</span> All schema rules passed! No issues detected.
        </div>
      `;
    } else {
      this.summaryEl.innerHTML = `
        <div style="color:var(--color-amber);">
          ${this.issues.length} potential issue(s) detected:
        </div>
      `;

      this.issues.forEach(issue => {
        const item = document.createElement('div');
        item.className = 'health-item';
        item.innerHTML = `
          <span class="health-badge ${issue.type}">${issue.type}</span>
          <div>
            <div class="health-text">${escapeHtml(issue.title)}</div>
            <div class="health-subtext">${escapeHtml(issue.subtitle)}</div>
          </div>
        `;

        item.addEventListener('click', () => {
          store.state.selectedTableIds = [issue.tableId];
          tableManager.renderSelectedStates();
          panelManager.openEditor(issue.tableId);
          this.closeModal();

          // Center table on canvas
          const t = store.tables.find(tbl => tbl.id === issue.tableId);
          if (t) {
            const vp = store.state.viewport;
            vp.x = canvasManager.viewportEl.clientWidth / 2 - (t.x + 135) * vp.scale;
            vp.y = canvasManager.viewportEl.clientHeight / 2 - (t.y + 60) * vp.scale;
            canvasManager.scheduleTransform();
          }
        });

        this.issuesListEl.appendChild(item);
      });
    }

    this.modalEl.classList.add('is-open');
  }

  closeModal() {
    this.modalEl.classList.remove('is-open');
  }
}

// =============================================================================
// COMMAND PALETTE (CMD+K)
// =============================================================================
class CommandPalette {
  constructor() {
    this.modalEl = document.getElementById('cmd-palette-modal');
    this.inputEl = document.getElementById('cmd-palette-input');
    this.listEl = document.getElementById('cmd-palette-list');

    this.selectedIndex = 0;
    this.items = [];

    this.setupEvents();
  }

  setupEvents() {
    const triggerBtn = document.getElementById('cmd-palette-btn');
    if (triggerBtn) triggerBtn.addEventListener('click', () => this.open());

    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.open();
      }
    });

    this.inputEl.addEventListener('input', () => this.filter());
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectPrev();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.executeSelected();
      } else if (e.key === 'Escape') {
        this.close();
      }
    });

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });
  }

  open() {
    this.inputEl.value = '';
    this.selectedIndex = 0;
    this.filter();
    this.modalEl.classList.add('is-open');
    setTimeout(() => this.inputEl.focus(), 50);
  }

  close() {
    this.modalEl.classList.remove('is-open');
  }

  filter() {
    const q = this.inputEl.value.toLowerCase().trim();
    const results = [];

    // Built-in commands
    const commands = [
      { id: 'add_table', title: 'Add New Table', category: 'Action', kbd: 'N', action: () => tableManager.createNewTable() },
      { id: 'auto_layout', title: 'Auto Layout Diagram', category: 'Action', kbd: '', action: () => layoutManager.runAutoLayout() },
      { id: 'fit_screen', title: 'Fit to Screen', category: 'View', kbd: 'F', action: () => canvasManager.fitToScreen() },
      { id: 'export_sql', title: 'Export SQL DDL / Diagram', category: 'Export', kbd: '', action: () => exportImportManager.openExportModal() },
      { id: 'import_sql', title: 'Import SQL DDL', category: 'Import', kbd: '', action: () => exportImportManager.openImportModal() },
      { id: 'toggle_theme', title: `Switch to ${store.state.theme === 'dark' ? 'Light' : 'Dark'} Theme`, category: 'Appearance', kbd: '', action: () => toggleTheme() },
      { id: 'dialect_pg', title: 'Switch Dialect to PostgreSQL', category: 'Dialect', kbd: '', action: () => setDialect('postgresql') },
      { id: 'dialect_mysql', title: 'Switch Dialect to MySQL', category: 'Dialect', kbd: '', action: () => setDialect('mysql') },
      { id: 'dialect_sqlite', title: 'Switch Dialect to SQLite', category: 'Dialect', kbd: '', action: () => setDialect('sqlite') },
      { id: 'check_health', title: 'Inspect Schema Health', category: 'Health', kbd: '', action: () => healthManager.openModal() },
      { id: 'show_shortcuts', title: 'Keyboard Shortcuts Help', category: 'Help', kbd: '?', action: () => showShortcutsModal() }
    ];

    for (const cmd of commands) {
      if (!q || cmd.title.toLowerCase().includes(q) || cmd.category.toLowerCase().includes(q)) {
        results.push(cmd);
      }
    }

    // Tables & Columns search
    for (const t of store.tables) {
      if (t.name.toLowerCase().includes(q)) {
        results.push({
          id: `t_${t.id}`,
          title: `Table: ${t.name}`,
          category: 'Navigate',
          kbd: '',
          action: () => {
            store.state.selectedTableIds = [t.id];
            tableManager.renderSelectedStates();
            panelManager.openEditor(t.id);
            const vp = store.state.viewport;
            vp.x = canvasManager.viewportEl.clientWidth / 2 - (t.x + 135) * vp.scale;
            vp.y = canvasManager.viewportEl.clientHeight / 2 - (t.y + 60) * vp.scale;
            canvasManager.scheduleTransform();
          }
        });
      }

      for (const col of t.columns) {
        if (col.name.toLowerCase().includes(q)) {
          results.push({
            id: `c_${col.id}`,
            title: `Column: ${t.name}.${col.name} (${col.type})`,
            category: 'Navigate',
            kbd: '',
            action: () => {
              store.state.selectedTableIds = [t.id];
              tableManager.renderSelectedStates();
              panelManager.openEditor(t.id);
              const vp = store.state.viewport;
              vp.x = canvasManager.viewportEl.clientWidth / 2 - (t.x + 135) * vp.scale;
              vp.y = canvasManager.viewportEl.clientHeight / 2 - (t.y + 60) * vp.scale;
              canvasManager.scheduleTransform();
            }
          });
        }
      }
    }

    this.items = results;
    this.selectedIndex = 0;
    this.renderItems();
  }

  renderItems() {
    this.listEl.innerHTML = '';
    if (this.items.length === 0) {
      this.listEl.innerHTML = `<div style="padding:14px; text-align:center; color:var(--text-muted); font-size:13px;">No matching commands or tables found</div>`;
      return;
    }

    this.items.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = `palette-item ${idx === this.selectedIndex ? 'is-selected' : ''}`;
      el.innerHTML = `
        <div class="palette-item-left">
          <span style="font-size:11px; opacity:0.6; min-width:55px;">${escapeHtml(item.category)}</span>
          <span>${escapeHtml(item.title)}</span>
        </div>
        ${item.kbd ? `<span class="kbd-shortcut">${escapeHtml(item.kbd)}</span>` : ''}
      `;

      el.addEventListener('click', () => {
        this.selectedIndex = idx;
        this.executeSelected();
      });

      this.listEl.appendChild(el);
    });
  }

  selectNext() {
    if (this.items.length === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
    this.renderItems();
  }

  selectPrev() {
    if (this.items.length === 0) return;
    this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
    this.renderItems();
  }

  executeSelected() {
    if (this.items[this.selectedIndex]) {
      this.close();
      this.items[this.selectedIndex].action();
    }
  }
}

// =============================================================================
// PROJECTS MANAGER MODAL
// =============================================================================
class ProjectsManager {
  constructor() {
    this.modalEl = document.getElementById('projects-modal');
    this.listEl = document.getElementById('projects-list');
    this.nameInput = document.getElementById('new-project-name-input');
    this.createBtn = document.getElementById('create-project-btn');
    this.closeBtn = document.getElementById('projects-modal-close-btn');

    this.setupEvents();
  }

  setupEvents() {
    const selectorBtn = document.getElementById('project-selector-btn');
    if (selectorBtn) selectorBtn.addEventListener('click', () => this.open());
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());

    if (this.createBtn) {
      this.createBtn.addEventListener('click', () => {
        const name = this.nameInput.value.trim();
        if (!name) return;
        this.createProject(name);
        this.nameInput.value = '';
      });
    }

    if (this.nameInput) {
      this.nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const name = this.nameInput.value.trim();
          if (!name) return;
          this.createProject(name);
          this.nameInput.value = '';
        }
      });
    }
  }

  open() {
    this.renderList();
    this.modalEl.classList.add('is-open');
  }

  close() {
    this.modalEl.classList.remove('is-open');
  }

  createProject(name) {
    const newProj = {
      id: generateId('proj'),
      name: name,
      tables: [],
      relationships: [],
      updatedAt: Date.now()
    };
    store.state.projects.push(newProj);
    this.switchProject(newProj.id);
    this.renderList();
    showToast(`Created project "${name}"`);
  }

  switchProject(projectId) {
    const proj = store.state.projects.find(p => p.id === projectId);
    if (!proj) return;

    store.state.currentProjectId = proj.id;
    store.state.selectedTableIds = [];
    store.state.selectedRelationshipId = null;

    document.getElementById('current-project-name').textContent = proj.name;
    store.saveToStorage();
    tableManager.renderAll();
    canvasManager.fitToScreen();
    this.close();
    showToast(`Switched to "${proj.name}"`);
  }

  renameProject(projectId) {
    const proj = store.state.projects.find(p => p.id === projectId);
    if (!proj) return;
    const newName = prompt('Enter new project name:', proj.name);
    if (newName && newName.trim()) {
      proj.name = newName.trim();
      document.getElementById('current-project-name').textContent = proj.name;
      store.saveToStorage();
      this.renderList();
      showToast(`Renamed project to "${proj.name}"`);
    }
  }

  deleteProject(projectId) {
    if (store.state.projects.length <= 1) {
      showToast('Cannot delete the only remaining project', 'warning');
      return;
    }
    const proj = store.state.projects.find(p => p.id === projectId);
    if (!confirm(`Are you sure you want to delete project "${proj.name}"?`)) return;

    store.state.projects = store.state.projects.filter(p => p.id !== projectId);
    if (store.state.currentProjectId === projectId) {
      this.switchProject(store.state.projects[0].id);
    } else {
      store.saveToStorage();
      this.renderList();
    }
    showToast(`Deleted project "${proj.name}"`);
  }

  renderList() {
    this.listEl.innerHTML = '';
    for (const proj of store.state.projects) {
      const isCur = proj.id === store.state.currentProjectId;
      const item = document.createElement('div');
      item.className = 'palette-item';
      item.style.padding = '10px 12px';
      if (isCur) item.classList.add('is-selected');

      item.innerHTML = `
        <div class="palette-item-left" style="flex:1; min-width:0;">
          <strong style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(proj.name)}</strong>
          <span style="font-size:11px; opacity:0.6; font-family:var(--font-mono);">${proj.tables.length} tables</span>
          ${isCur ? '<span class="kbd-shortcut" style="color:var(--accent-light);">ACTIVE</span>' : ''}
        </div>
        <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
          <button class="btn-icon proj-rename-btn" title="Rename Project" style="width:26px; height:26px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="btn-icon proj-del-btn" title="Delete Project" style="width:26px; height:26px; color:var(--color-rose);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
          </button>
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        this.switchProject(proj.id);
      });

      const renameBtn = item.querySelector('.proj-rename-btn');
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.renameProject(proj.id);
      });

      const delBtn = item.querySelector('.proj-del-btn');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteProject(proj.id);
      });

      this.listEl.appendChild(item);
    }
  }
}

// =============================================================================
// GLOBAL MANAGERS INSTANTIATION
// =============================================================================
let canvasManager;
let tableManager;
let relationshipManager;
let panelManager;
let layoutManager;
let healthManager;
let commandPalette;
let exportImportManager;
let projectsManager;

// =============================================================================
// 10. EVENT HANDLERS, THEME, SHORTCUTS, TOASTS
// =============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span>${type === 'error' ? '⚠️' : type === 'warning' ? '⚡' : '✓'}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));

  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

function toggleTheme() {
  const newTheme = store.state.theme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

function setTheme(theme) {
  store.state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('schemaforge_theme', theme);

  const moonIcon = document.getElementById('theme-moon-icon');
  const sunIcon = document.getElementById('theme-sun-icon');
  if (moonIcon && sunIcon) {
    if (theme === 'light') {
      moonIcon.style.display = 'none';
      sunIcon.style.display = 'block';
    } else {
      moonIcon.style.display = 'block';
      sunIcon.style.display = 'none';
    }
  }
  canvasManager.scheduleTransform();
}

function setDialect(dialect) {
  store.state.dialect = dialect;
  localStorage.setItem('schemaforge_dialect', dialect);

  const label = document.getElementById('dialect-label');
  if (label) {
    label.textContent = dialect === 'postgresql' ? 'PostgreSQL' : dialect === 'mysql' ? 'MySQL' : 'SQLite';
  }
  showToast(`Switched SQL dialect to ${label.textContent}`);
}

function showShortcutsModal() {
  const modal = document.getElementById('shortcuts-modal');
  if (modal) modal.classList.add('is-open');
}

function closeShortcutsModal() {
  const modal = document.getElementById('shortcuts-modal');
  if (modal) modal.classList.remove('is-open');
}

function loadTemplate(templateKey) {
  const template = STARTER_TEMPLATES[templateKey];
  if (!template) return;

  history.snapshot();
  store.currentProject.tables = JSON.parse(JSON.stringify(template.tables));
  store.currentProject.relationships = JSON.parse(JSON.stringify(template.relationships));
  store.currentProject.name = template.name;
  document.getElementById('current-project-name').textContent = template.name;

  store.saveToStorage();
  tableManager.renderAll();
  canvasManager.fitToScreen();
  showToast(`Loaded ${template.name} template!`);
}

// Global Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  // If typing in input or textarea, skip global hotkeys
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
    return;
  }

  // Cmd/Ctrl + Z: Undo
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    history.undo();
    return;
  }

  // Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y: Redo
  if (((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
      ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y')) {
    e.preventDefault();
    history.redo();
    return;
  }

  // Cmd/Ctrl + D: Duplicate selected table
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    if (store.state.selectedTableIds.length > 0) {
      tableManager.duplicateTable(store.state.selectedTableIds[0]);
    }
    return;
  }

  // Cmd/Ctrl + A: Select all tables
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    store.state.selectedTableIds = store.tables.map(t => t.id);
    tableManager.renderSelectedStates();
    return;
  }

  // N: New Table
  if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    tableManager.createNewTable();
    return;
  }

  // F: Fit to Screen
  if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    canvasManager.fitToScreen();
    return;
  }

  // G: Toggle Snap
  if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    store.state.snapToGrid = !store.state.snapToGrid;
    const snapBtn = document.getElementById('snap-grid-btn');
    if (snapBtn) snapBtn.classList.toggle('is-active', store.state.snapToGrid);
    showToast(`Snap to Grid: ${store.state.snapToGrid ? 'ON' : 'OFF'}`);
    return;
  }

  // M: Toggle Minimap
  if (e.key.toLowerCase() === 'm' && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    store.state.showMinimap = !store.state.showMinimap;
    const mini = document.getElementById('minimap-container');
    if (mini) mini.classList.toggle('is-hidden', !store.state.showMinimap);
    canvasManager.scheduleTransform();
    return;
  }

  // ?: Shortcuts
  if (e.key === '?') {
    e.preventDefault();
    showShortcutsModal();
    return;
  }

  // Delete / Backspace: Remove selected
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (store.state.selectedTableIds.length > 0) {
      e.preventDefault();
      history.snapshot();
      for (const id of store.state.selectedTableIds) {
        tableManager.deleteTable(id);
      }
    }
  }

  // Escape: Deselect / Close modal
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.is-open').forEach(m => m.classList.remove('is-open'));
    panelManager.closeEditor();
    store.state.selectedTableIds = [];
    tableManager.renderSelectedStates();
  }
});

// App Startup & Initialization
window.addEventListener('DOMContentLoaded', () => {
  // Set initial theme
  setTheme(store.state.theme);

  // Initialize Managers
  canvasManager = new CanvasManager();
  tableManager = new TableManager();
  relationshipManager = new RelationshipManager();
  panelManager = new PanelManager();
  layoutManager = new AutoLayoutManager();
  healthManager = new HealthManager();
  commandPalette = new CommandPalette();
  exportImportManager = new ExportImportManager();
  projectsManager = new ProjectsManager();

  // Set Project Name
  const projNameEl = document.getElementById('current-project-name');
  if (projNameEl) projNameEl.textContent = store.currentProject.name;

  // Set Dialect Label
  const dialectLabel = document.getElementById('dialect-label');
  if (dialectLabel) {
    dialectLabel.textContent = store.state.dialect === 'postgresql' ? 'PostgreSQL' : store.state.dialect === 'mysql' ? 'MySQL' : 'SQLite';
  }

  // Dialect Toggle Button
  const dialectToggleBtn = document.getElementById('dialect-toggle-btn');
  if (dialectToggleBtn) {
    dialectToggleBtn.addEventListener('click', () => {
      const dialects = ['postgresql', 'mysql', 'sqlite'];
      const nextIdx = (dialects.indexOf(store.state.dialect) + 1) % dialects.length;
      setDialect(dialects[nextIdx]);
    });
  }

  // Theme Toggle Button
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

  // Add Table Buttons
  const addTableBtn = document.getElementById('add-table-btn');
  if (addTableBtn) addTableBtn.addEventListener('click', () => tableManager.createNewTable());
  const emptyAddBtn = document.getElementById('empty-add-table-btn');
  if (emptyAddBtn) emptyAddBtn.addEventListener('click', () => tableManager.createNewTable());
  const mobileAddBtn = document.getElementById('mobile-add-btn');
  if (mobileAddBtn) mobileAddBtn.addEventListener('click', () => tableManager.createNewTable());

  // Auto Layout Buttons
  const autoLayoutBtn = document.getElementById('auto-layout-btn');
  if (autoLayoutBtn) autoLayoutBtn.addEventListener('click', () => layoutManager.runAutoLayout());

  // Health Button
  const healthBtn = document.getElementById('health-btn');
  if (healthBtn) healthBtn.addEventListener('click', () => healthManager.openModal());

  // Zoom / Controls Buttons
  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');
  const fitBtn = document.getElementById('fit-screen-btn');
  const mobileFitBtn = document.getElementById('mobile-fit-btn');
  const snapBtn = document.getElementById('snap-grid-btn');
  const toggleMinimapBtn = document.getElementById('toggle-minimap-btn');

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      canvasManager.zoomAtPoint(
        canvasManager.viewportEl.clientWidth / 2,
        canvasManager.viewportEl.clientHeight / 2,
        1.2
      );
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      canvasManager.zoomAtPoint(
        canvasManager.viewportEl.clientWidth / 2,
        canvasManager.viewportEl.clientHeight / 2,
        0.8
      );
    });
  }

  if (fitBtn) fitBtn.addEventListener('click', () => canvasManager.fitToScreen());
  if (mobileFitBtn) mobileFitBtn.addEventListener('click', () => canvasManager.fitToScreen());

  if (snapBtn) {
    snapBtn.addEventListener('click', () => {
      store.state.snapToGrid = !store.state.snapToGrid;
      snapBtn.classList.toggle('is-active', store.state.snapToGrid);
      showToast(`Snap to Grid: ${store.state.snapToGrid ? 'ON' : 'OFF'}`);
    });
  }

  if (toggleMinimapBtn) {
    toggleMinimapBtn.addEventListener('click', () => {
      store.state.showMinimap = !store.state.showMinimap;
      const mini = document.getElementById('minimap-container');
      if (mini) mini.classList.toggle('is-hidden', !store.state.showMinimap);
      canvasManager.scheduleTransform();
    });
  }

  // Templates cards click handlers
  document.querySelectorAll('[data-template]').forEach(el => {
    el.addEventListener('click', () => {
      const templateKey = el.dataset.template;
      loadTemplate(templateKey);
    });
  });

  const templatesBtn = document.getElementById('templates-btn');
  if (templatesBtn) {
    templatesBtn.addEventListener('click', () => {
      const emptyState = document.getElementById('empty-state');
      if (emptyState) emptyState.classList.toggle('is-hidden');
    });
  }

  const emptyImportBtn = document.getElementById('empty-import-sql-btn');
  if (emptyImportBtn) {
    emptyImportBtn.addEventListener('click', () => exportImportManager.openImportModal());
  }

  // Shortcuts Modal Buttons
  const shortcutsBtn = document.getElementById('shortcuts-help-btn');
  const shortcutsCloseBtn = document.getElementById('shortcuts-modal-close-btn');
  if (shortcutsBtn) shortcutsBtn.addEventListener('click', showShortcutsModal);
  if (shortcutsCloseBtn) shortcutsCloseBtn.addEventListener('click', closeShortcutsModal);

  // Undo / Redo Click Handlers
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  const mobileUndoBtn = document.getElementById('mobile-undo-btn');
  const mobileRedoBtn = document.getElementById('mobile-redo-btn');

  if (undoBtn) undoBtn.addEventListener('click', () => history.undo());
  if (redoBtn) redoBtn.addEventListener('click', () => history.redo());
  if (mobileUndoBtn) mobileUndoBtn.addEventListener('click', () => history.undo());
  if (mobileRedoBtn) mobileRedoBtn.addEventListener('click', () => history.redo());

  // Mobile More Menu button
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => commandPalette.open());
  }

  // Window Resize
  window.addEventListener('resize', () => {
    canvasManager.scheduleTransform();
  });

  // Render Initial Diagram
  tableManager.renderAll();
  canvasManager.fitToScreen();

  // Check URL hash if project was shared
  exportImportManager.checkUrlHashOnLoad();

  // Periodic Autosave
  setInterval(() => {
    store.saveToStorage();
  }, 3000);
});
