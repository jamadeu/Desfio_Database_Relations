import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);
    if (!customer) {
      throw new AppError('The customer not exists');
    }

    if (products.length === 0) {
      throw new AppError('Products not found');
    }

    const foundedProduct = await this.productsRepository.findAllById(products);
    if (foundedProduct.length < products.length) {
      throw new AppError('Products not found');
    }

    const productsMapped = foundedProduct.map(product => {
      const [newProduct] = products.filter(
        prodFind => prodFind.id === product.id,
      );

      if (newProduct.quantity > product.quantity) {
        throw new AppError('Quantity unavailable');
      }

      return {
        product_id: product.id,
        price: product.price,
        quantity: newProduct.quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productsMapped,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateProductService;
