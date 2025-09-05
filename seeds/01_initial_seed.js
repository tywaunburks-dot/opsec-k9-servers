const bcrypt = require('bcrypt');
exports.seed = async function(knex) {
  await knex('time_logs').del();
  await knex('training_sessions').del();
  await knex('vaccinations').del();
  await knex('k9s').del();
  await knex('sites').del();
  await knex('users').del();
  await knex('orgs').del();

  const [orgId] = await knex('orgs').insert({ name: 'OPSEC K9' }).returning('id');
  const pass = await bcrypt.hash('password123', 10);
  await knex('users').insert([{ name: 'Owner Admin', email: 'admin@opsec.local', password_hash: pass, role: 'admin', org_id: orgId },
                              { name: 'Trainer One', email: 'trainer@opsec.local', password_hash: pass, role: 'trainer', org_id: orgId },
                              { name: 'Handler One', email: 'handler@opsec.local', password_hash: pass, role: 'handler', org_id: orgId }]);
  await knex('sites').insert([{ name: 'OPSEC Training Yard', lat: 40.0, lon: -86.0, radius_meters: 500 }]);
  await knex('k9s').insert([{ name: 'Rex', breed: 'German Shepherd', dob: '2019-05-01', sex: 'M', call_sign: 'Rex', status: 'Active' }]);
};
