exports.up = function(knex) {
  return knex.schema
    .createTable('orgs', t => { t.increments('id').primary(); t.string('name'); })
    .createTable('users', t => { t.increments('id').primary(); t.string('name'); t.string('email').unique(); t.string('password_hash'); t.string('role'); t.integer('org_id').references('orgs.id'); })
    .createTable('sites', t => { t.increments('id').primary(); t.string('name'); t.float('lat'); t.float('lon'); t.integer('radius_meters'); })
    .createTable('k9s', t => { t.increments('id').primary(); t.string('name'); t.string('breed'); t.date('dob'); t.string('sex'); t.string('call_sign'); t.string('status'); })
    .createTable('vaccinations', t => { t.increments('id').primary(); t.integer('k9_id').references('k9s.id'); t.string('type'); t.date('date'); t.string('file'); })
    .createTable('training_sessions', t => { t.increments('id').primary(); t.integer('k9_id').references('k9s.id'); t.string('discipline'); t.string('area'); t.integer('duration_minutes'); t.text('notes'); t.timestamp('date'); })
    .createTable('time_logs', t => { t.increments('id').primary(); t.integer('user_id').references('users.id'); t.float('lat'); t.float('lon'); t.integer('site_id').references('sites.id'); t.boolean('inside_geofence'); t.string('job_code'); t.string('selfie'); t.timestamp('clock_in'); });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('time_logs')
    .dropTableIfExists('training_sessions')
    .dropTableIfExists('vaccinations')
    .dropTableIfExists('k9s')
    .dropTableIfExists('sites')
    .dropTableIfExists('users')
    .dropTableIfExists('orgs');
};
