// Optional compatibility shim for Linux CI containers where Node's
// os.networkInterfaces() throws despite loopback sockets working.
// Never enabled by the Windows launcher or production renders.
const os = require('node:os');

try {
  os.networkInterfaces();
} catch (error) {
  if (!String(error?.message).includes('uv_interface_addresses')) {
    throw error;
  }
  os.networkInterfaces = () => ({
    lo: [{
      address: '127.0.0.1',
      netmask: '255.0.0.0',
      family: 'IPv4',
      mac: '00:00:00:00:00:00',
      internal: true,
      cidr: '127.0.0.1/8',
    }],
  });
  console.error('[CI] Using local loopback metadata for Remotion.');
}
